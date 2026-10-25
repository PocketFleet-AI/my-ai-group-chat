// @content-section runtime-preamble
const PANEL_ID = "folded-host-bridge-panel";
const structuralSelectors = globalThis.FEATURE_STRUCTURAL_SELECTORS;
const CALL_KEY = "folded_host_tool_call";
const adapterProfile = globalThis.resolveChatAiAdapterProfile?.(
  typeof window !== "undefined" ? window.location.href : "https://chatgpt.com/",
) || globalThis.CHAT_AI_ADAPTER_PROFILES?.[0];
const BRIDGE_HEADER = adapterProfile?.id === "chatgpt-folded-host" ? adapterProfile.macros.action : "[#bridge:v1]";
const THETA_HEADER = adapterProfile?.id === "qwen-theta" ? adapterProfile.macros.action : "[#theta:v1]";
const DELIVERY_SUBMIT_TIMEOUT_MS = adapterProfile?.submitTimeoutMs || 15000;
const DELIVERY_WAKE_TIMEOUT_MS = adapterProfile?.wakeTimeoutMs || 30000;
const CONTENT_INSTANCE_ID = globalThis.crypto?.randomUUID?.()
  || `bridge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
if (typeof window !== "undefined") {
  window.__pocketfleet_instance_id = CONTENT_INSTANCE_ID;
}
const handled = new Set();
const executedMessages = new WeakSet();
const messageStates = new WeakMap();

function persistHandledCodeAiId(id) {
  if (!id) return;
  handled.add(id);
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
      chrome.storage.local.get(["codeai_handled_ids"], (res) => {
        const list = Array.isArray(res?.codeai_handled_ids) ? res.codeai_handled_ids : [];
        if (!list.includes(id)) {
          list.push(id);
          if (list.length > 300) list.splice(0, list.length - 300);
          chrome.storage.local.set({ codeai_handled_ids: list });
        }
      });
    }
  } catch {}
}

try {
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get(["codeai_handled_ids"], (res) => {
      const list = res?.codeai_handled_ids;
      if (Array.isArray(list)) {
        for (const id of list) handled.add(id);
      }
    });
  }
} catch {}
const STABILITY_WINDOW_MS = adapterProfile?.stabilityWindowMs || 600;
const DOUBAO_RESPONSE_STABILITY_MS = adapterProfile?.responseStabilityMs || 5000;
const PAGE_SCAN_DEBOUNCE_MS = 3000;
const CONTENT_PROTOCOL_VERSION = "unified-telegram-v1";
const ROUTE_BASELINE_QUIET_MS = 2000;
let isScanningTheta = false;
const isQwen = adapterProfile?.id === "qwen-theta";
const isDoubao = adapterProfile?.id?.startsWith("doubao-heart");
const isGrok = adapterProfile?.id === "grok-web";
const isClaude = adapterProfile?.id === "claude-web";
// @content-section runtime-state
let activityIsIdle = true;
let connectionKey = "panelChecking";
let connectionDetail = "";
let connectionState = "checking";
let activityMessage = defaultActivityMessage();
let activityWarning = false;
let killSwitchActive = null;
let pendingDelivery = null;
const localExecutedDeliveryIds = new Set();
let bridgeInstanceActive = true;
let panelClaimed = false;
let pageObserver = null;
let visibilityHandler = null;
let pageScanTimer = null;
let routeBaselineTimer = null;
let routeBaselinePending = false;
let activePageRoute = null;
const managedIntervals = [];

// @content-section runtime-ownership
function ownsPanel(root = null) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return true;
  root ||= document.getElementById(PANEL_ID);
  if (!root) return false;
  return root.dataset?.bridgeOwner === CONTENT_INSTANCE_ID;
}

function isSupersededByOtherInstance() {
  if (typeof window !== "undefined" && window.__pocketfleet_instance_id && window.__pocketfleet_instance_id !== CONTENT_INSTANCE_ID) {
    return true;
  }
  return false;
}

function deactivateBridgeInstance() {
  if (!bridgeInstanceActive) return;
  bridgeInstanceActive = false;
  pageObserver?.disconnect();
  if (pageScanTimer) clearTimeout(pageScanTimer);
  if (statusPollTimer) clearTimeout(statusPollTimer);
  statusPollTimer = null;
  if (routeBaselineTimer) clearTimeout(routeBaselineTimer);
  pageScanTimer = null;
  routeBaselineTimer = null;
  for (const intervalId of managedIntervals) clearInterval(intervalId);
  managedIntervals.length = 0;
  if (visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityHandler);
  }
}

function retireIfSuperseded() {
  if (!bridgeInstanceActive) return true;
  if (isSupersededByOtherInstance()) {
    deactivateBridgeInstance();
    return true;
  }
  return false;
}

function isInvalidatedContextError(error) {
  const msg = String(error?.message || error);
  return msg.includes("Extension context invalidated")
    || msg.includes("message port closed before a response was received")
    || msg.includes("Receiving end does not exist");
}

// @content-section runtime-transport
async function send(message) {
  if (retireIfSuperseded()) throw new Error("Bridge content instance superseded.");
  try {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) throw new Error(response?.error || "Bridge request failed.");
    return response.data;
  } catch (error) {
    if (isInvalidatedContextError(error)) deactivateBridgeInstance();
    throw error;
  }
}

/** 状态轮询节流（指挥官 2026-10-14：离线态连续刷新扰输入框光标）。
 *  ① 后台轮询 silent：已有确定态时保持显示、结果落地才更新 ⇒ 稳态零 DOM 写入，面板不闪跳；
 *  ② 离线指数退避 5s→10s→20s→40s→60s 封顶，恢复即复位；窗口聚焦/可见性变化仍即时刷新；
 *  ③ 在途防叠加：挂起请求期间静默轮询直接让位（防慢请求堆积与状态乱序）；
 *  ④ 轮询链由本函数 finally 自调度，取代固定 5s interval。 */
const STATUS_POLL_BASE_MS = 5000;
const STATUS_POLL_MAX_MS = 60000;
let statusPollFailures = 0;
let statusPollInFlight = false;
let statusPollTimer = null;

function nextStatusPollDelay() {
  return Math.min(STATUS_POLL_BASE_MS * Math.pow(2, statusPollFailures), STATUS_POLL_MAX_MS);
}

function scheduleStatusPoll(delayMs) {
  if (statusPollTimer) clearTimeout(statusPollTimer);
  statusPollTimer = setTimeout(() => {
    statusPollTimer = null;
    if (retireIfSuperseded()) return;
    refreshStatus({ silent: true });
  }, delayMs);
}

async function refreshStatus(options = {}) {
  const silent = options.silent === true;
  if (silent && statusPollInFlight) {
    // 让位在途请求（其 finally 会续链），此处补排一次保证链路不断
    scheduleStatusPoll(nextStatusPollDelay());
    return;
  }
  statusPollInFlight = true;
  // 仅「尚无确定态」或用户主动触发才闪「检测中」；静默轮询保持上态显示，
  // 杜绝旧行为每 5 秒「检测中→离线」两态翻飞（面板抖动 + 全页 DOM 写入）
  if (!silent || connectionKey === "panelChecking") setConnectionKey("panelChecking", "checking");
  try {
    const current = await send({ type: "bridge-status" });
    killSwitchActive = current.kill_switch_active;
    statusPollFailures = 0;
    if (current.kill_switch_active) {
      setConnectionKey("panelPaused", "warning");
    } else {
      setConnectionKey("panelConnected", "connected");
    }
  } catch (error) {
    // 2026-10-16 保态修正（游隼）：单次探测失败不再把暂停态重置为 null（未知）。
    // test-6 实证：页面刷新后探测未决/单次失败 ⇒ null 被 `!== false` 系列门误判为
    // 「已暂停/不可用」，提交熔断、拉取停摆。未知 ≠ 暂停：保留末态继续作业，
    // 连接状况由 connectionKey（panelDisconnected）如实呈现，恢复后探测自动纠正。
    statusPollFailures = Math.min(statusPollFailures + 1, 10);
    let msg = error.message || String(error);
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = panelT("panelBridgeOffline");
    }
    setConnectionKey("panelDisconnected", "disconnected", msg);
  } finally {
    statusPollInFlight = false;
    if (!retireIfSuperseded()) scheduleStatusPoll(nextStatusPollDelay());
  }
}
async function toggleExecution() {
  if (killSwitchActive === null) return;
  const action = killSwitchActive ? "resume" : "pause";
  setActivity(panelT(action === "pause" ? "panelPausing" : "panelResuming"));
  try {
    await send({ type: "bridge-control", action, humanGesture: true });
    await refreshStatus();
    setActivity(panelT(action === "pause" ? "panelPausedDone" : "panelResumedDone"));
  } catch (error) {
    setActivity(panelT("panelControlFailed") + error.message);
  }
}

// @content-section runtime-route
function pageRouteKey(url = null) {
  try {
    const parsed = new URL(url || window.location.href);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url || "");
  }
}

// ── PocketFleet [PFBus] 出站直通门禁 ───
// 标准格式：以 [PFBus]re:{someone} 或 [PFBus][mailto:{someone}] 为开头
// @content-section runtime-scheduling
function runPageScan() {
  pageScanTimer = null;
  if (retireIfSuperseded() || routeBaselinePending) return;
  panel();
  scanCalls();
  scanCodeAiCalls();
  scanOpenClawTasks();
  scanTelegramCalls();
  if (isQwen) scanThetaCalls();
}

function schedulePageScan(delayMs = PAGE_SCAN_DEBOUNCE_MS) {
  if (pageScanTimer) clearTimeout(pageScanTimer);
  pageScanTimer = setTimeout(runPageScan, delayMs);
}

function scheduleRouteBaseline() {
  routeBaselinePending = true;
  if (routeBaselineTimer) return; // 关键：已在倒计时中，严禁反复重置饿死！
  routeBaselineTimer = setTimeout(() => {
    routeBaselineTimer = null;
    if (retireIfSuperseded()) return;
    // Hydrated history in a destination conversation is never a new tool call.
    markExistingCallsHandled(null, { recoverLatestDoubao: false });
    routeBaselinePending = false;
    schedulePageScan(0);
  }, ROUTE_BASELINE_QUIET_MS);
}

function isSameOriginConversationPromotion(prevRoute, nextRoute) {
  try {
    if (!prevRoute || !nextRoute) return false;
    const prev = new URL(prevRoute);
    const next = new URL(nextRoute);
    if (prev.origin !== next.origin) return false;
    const isLanding = (p) => {
      const clean = p.replace(/\/+$/, '') || '/';
      return clean === '/' || clean === '/app' || clean === '/chat' || clean === '/new';
    };
    if (isLanding(prev.pathname) && !isLanding(next.pathname)) return true;
    if (prev.pathname.replace(/\/+$/, '') === next.pathname.replace(/\/+$/, '')) return true;
    return false;
  } catch {
    return false;
  }
}

function syncPageRoute() {
  const nextRoute = pageRouteKey();
  if (nextRoute === activePageRoute) return false;
  const prevRoute = activePageRoute;
  activePageRoute = nextRoute;

  // 会话晋升容忍：若当前正在等待/生成回复，且 URL 仅仅是由首页/新对话晋升为同源子会话，
  // 必须保留 activeReplyDeliveryId，并将 activeReplyRoute 平滑迁移到新 URL，绝不可误杀！
  if (activeReplyDeliveryId && isSameOriginConversationPromotion(prevRoute, nextRoute)) {
    console.log(`[PocketFleet] 🔄 检测到新会话晋升路由: ${nextRoute}，无缝迁移回复锁 ${activeReplyDeliveryId}`);
    activeReplyRoute = nextRoute;
    return false;
  }

  activeReplyDeliveryId = null;
  activeReplyRoute = null;
  activeReplyUserMessage = null;
  activeReplyPreviousAssistants = new Set();
  scheduleRouteBaseline();
  return true;
}

function handlePageMutation(records) {
  if (retireIfSuperseded()) return;
  // 面板自身重渲（连接态/活动文字）不视为页面变动：否则每轮状态写入都会喂给全页
  // MutationObserver 触发扫描，形成自激；批次里出现面板之外的变动才排扫描
  const panelRoot = typeof document !== "undefined" && document.getElementById(PANEL_ID);
  if (panelRoot && typeof panelRoot.contains === "function" && records && records.length
      && records.every((record) => panelRoot.contains(record.target))) {
    return;
  }
  if (syncPageRoute()) {
    panel();
    return;
  }
  if (routeBaselinePending) {
    return; // 关键：静默期内不响应微小 DOM 扰动，让倒计时按时完成
  }
  schedulePageScan();
}

