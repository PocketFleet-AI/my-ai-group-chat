const DEFAULT_ENDPOINT = "http://127.0.0.1:18765";

importScripts("selector_definitions.js", "adapter_profiles.js", "selector_engine.js", "selector_updates.js");
importScripts("studio_runner.js");
importScripts("conversation_target.js");

const telegramPostClaims = new Map();
let lastClaimPrune = 0;
async function pruneTelegramPostClaims() {
  const now = Date.now();
  if (now - lastClaimPrune < 60 * 60 * 1000) return;
  // The bridge rejects leases after 24h; keeping reservations for 48h is safe.
  const cutoff = now - 48 * 60 * 60 * 1000;
  const stored = await chrome.storage.local.get(null);
  const expired = Object.keys(stored).filter(key => key.startsWith('pocketfleet_outbound_')
    && Number.isFinite(stored[key]?.at) && stored[key].at < cutoff);
  if (expired.length) await chrome.storage.local.remove(expired);
  for (const [key, at] of telegramPostClaims) if (at < cutoff) telegramPostClaims.delete(key);
  lastClaimPrune = now;
}
async function reserveTelegramPost(payload) {
  const key = String(payload?.outbound_key || '');
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Outbound reservation key missing');
  if (telegramPostClaims.has(key)) return false;
  telegramPostClaims.set(key, Date.now());
  const storageKey = 'pocketfleet_outbound_' + key;
  const existing = await chrome.storage.local.get(storageKey);
  if (existing[storageKey]) return false;
  // Storage failure aborts sending. A reserved/uncertain reply is never retried.
  await chrome.storage.local.set({[storageKey]:{state:'attempted',at:Date.now()}});
  return true;
}

const registeredAiTabs = new Map(); // principal -> tabId

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [p, id] of registeredAiTabs.entries()) {
    if (id === tabId) registeredAiTabs.delete(p);
  }
});

async function scanAndLockAllAiTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      const profile = globalThis.resolveChatAiAdapterProfile?.(tab.url);
      if (profile && profile.principal) {
        registeredAiTabs.set(profile.principal, tab.id);
        chrome.tabs.update(tab.id, { autoDiscardable: false }).catch(() => {});
      }
    }
  } catch {}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    const url = tab.url || changeInfo.url;
    if (url) {
      const profile = globalThis.resolveChatAiAdapterProfile?.(url);
      if (profile && profile.principal) {
        registeredAiTabs.set(profile.principal, tabId);
        chrome.tabs.update(tabId, { autoDiscardable: false }).catch(() => {});
      }
    }
  }
});

// Service Worker 启动时全量扫描一次打开的 AI 标签页
scanAndLockAllAiTabs();


async function settings() {
  let current = await chrome.storage.local.get({
    endpoint: DEFAULT_ENDPOINT,
    token: "",
    autoRun: false,
  });
  if (!current.token) {
    try {
      const res = await fetch(chrome.runtime.getURL("seed_token.json"));
      if (res.ok) {
        const seed = await res.json();
        if (seed?.token) {
          current.token = seed.token.trim();
          if (seed.endpoint) current.endpoint = seed.endpoint.trim();
          await chrome.storage.local.set({
            endpoint: current.endpoint,
            token: current.token,
          });
        }
      }
    } catch {}
  }
  return current;
}

async function bridgeFetch(path, options = {}, principal = "folded-host-chatgpt-web", isRetry = false) {
  const current = await settings();
  const activeToken = (current.token || "").trim();
  if (!activeToken) {
    throw new Error("PocketFleet 通信令牌未在扩展中配置，请先在弹窗中填写。");
  }
  const response = await fetch(`${current.endpoint}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${activeToken}`,
      "Content-Type": "application/json",
      "X-Folded-Host-Extension-ID": chrome.runtime.id,
      "X-Folded-Host-Principal": principal,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && !isRetry) {
    // 自动自愈：当遭遇 401 令牌失配时，主动重读 seed_token.json 并热重试一次
    try {
      const res = await fetch(chrome.runtime.getURL("seed_token.json"), { cache: "no-store" });
      if (res.ok) {
        const seed = await res.json();
        const freshToken = seed?.token?.trim();
        if (freshToken && freshToken !== activeToken) {
          await chrome.storage.local.set({ token: freshToken });
          return bridgeFetch(path, options, principal, true);
        }
      }
    } catch {}
  }

  let body;
  const rawText = await response.text();
  try {
    body = JSON.parse(rawText);
  } catch {
    body = { error: rawText.trim() || `HTTP ${response.status}` };
  }
  if (!response.ok) {
    throw new Error(body.error || `Bridge returned HTTP ${response.status}`);
  }
  return body;
}

/* ---------------- PocketFleet V2 试用版官方签名凭据与握手同步 ---------------- */
// 正式公开发行版恪守 Free 永久 2 席商业基线，不内置 5 席试用凭证（内测体验机制与公开发行版明确隔离）
const CURRENT_TRIAL_CREDENTIAL = null;

let lastTrialSync = 0;
async function syncTrialCredentialWithBridge() {
  if (!CURRENT_TRIAL_CREDENTIAL) return;
  const now = Date.now();
  if (now - lastTrialSync < 10000) return;
  try {
    await bridgeFetch("/api/v1/trial/credential", {
      method: "POST",
      body: JSON.stringify(CURRENT_TRIAL_CREDENTIAL),
    }, "pocketfleet-trial-sync");
    lastTrialSync = now;
  } catch (e) {
    // 桌面桥离线或未就绪时静默跳过，下周期重试
  }
}

/* ---------------- 客户端拉起标签页与探活清理 ---------------- */
const pendingLaunchTabs = new Set();
let schemeLaunchPollTimer = null;
let lastOriginTabId = null;

async function cleanupLaunchTabs() {
  if (schemeLaunchPollTimer) {
    clearInterval(schemeLaunchPollTimer);
    schemeLaunchPollTimer = null;
  }
  // 关键：优先把焦点切回用户原本打开插件的标签页
  if (lastOriginTabId) {
    try {
      await chrome.tabs.update(lastOriginTabId, { active: true }).catch(() => {});
    } catch {}
  }
  for (const tabId of pendingLaunchTabs) {
    if (tabId !== lastOriginTabId) {
      try {
        await chrome.tabs.remove(tabId).catch(() => {});
      } catch {}
    }
  }
  pendingLaunchTabs.clear();
}

function startSchemeRestorePolling() {
  if (schemeLaunchPollTimer) return;
  let attempts = 0;
  schemeLaunchPollTimer = setInterval(async () => {
    attempts++;
    try {
      const res = await bridgeFetch("/api/v1/window/restore", { method: "POST" }, "pocketfleet-scheme-restore");
      if (res && res.ok) {
        cleanupLaunchTabs();
        return;
      }
    } catch {}
    if (attempts >= 40) {
      if (schemeLaunchPollTimer) {
        clearInterval(schemeLaunchPollTimer);
        schemeLaunchPollTimer = null;
      }
    }
  }, 750);
}

try {
  if (chrome.tabs && chrome.tabs.onRemoved && chrome.tabs.onRemoved.addListener) {
    chrome.tabs.onRemoved.addListener((removedTabId) => {
      pendingLaunchTabs.delete(removedTabId);
    });
  }
} catch {}


// OpenClaw 文本神经纤维 Thin Relay（施工令 20260915101321 · 路径B）。
// 纯 transport 转发到独立端点 18766，不经过 18765 控制链。
// 出站状态机 NEW → IN_FLIGHT → TERMINAL（P0热修 20260915152251 P0-2 · FINAL_E2E_PASS 20260915152413 §2-4）：
// 在发出任何 HTTP POST 之前，先把 task_id 以 IN_FLIGHT 持久写入 storage；
// IN_FLIGHT / TERMINAL 一律不再 POST，只有 NEW 允许第一次发送。
// 状态跨 DOM mutation、content-script 重复扫描与页面刷新保持。
// deps 注入（storageGet/storageSet/fetchFn/now）仅供离线 20× 回归，生产路径用 chrome 原生。
// 内存同步闸：同一事件循环内 check+claim 原子（durable 层跨 await 有 TOCTOU 窗口，
// 20× 并发重扫实测全部穿透——与 relay pop-before-persist 同族竞态，FINAL_E2E_PASS §4/§6）。
// SW 重启时内存闸丢失 ⇒ 由持久层 IN_FLIGHT/TERMINAL 兜底（重启后不重发）。
const openclawMemClaims = new Map();
let openclawStorageLock = Promise.resolve();
function withStorageLock(fn) {
  const next = openclawStorageLock.then(fn, fn);
  openclawStorageLock = next.catch(() => {});
  return next;
}
async function handleOpenClawTask(payload, deps) {
  const storageGet = (deps && deps.storageGet) || ((k) => chrome.storage.local.get(k));
  const storageSet = (deps && deps.storageSet) || ((o) => chrome.storage.local.set(o));
  const fetchFn = (deps && deps.fetchFn) || ((url, opts) => fetch(url, opts));
  const now = (deps && deps.now) || (() => new Date().toISOString());
  const d = { storageGet, storageSet, fetchFn, now };
  const taskId = String(payload.task_id || "");
  const storeKey = "openclaw_tasks";

  const getBridgeStatus = (deps && deps.getBridgeStatus) || (typeof bridgeFetch === 'function' ? () => bridgeFetch("/api/v1/status").catch(() => null) : null);
  if (getBridgeStatus) {
    const bridgeStatus = await getBridgeStatus();
    if (!bridgeStatus || bridgeStatus.kill_switch_active !== false) {
      return {
        task_id: taskId,
        status: "blocked",
        error: "Bridge paused or status unknown; OpenClaw task execution denied.",
        in_flight: false
      };
    }
  }

  // 第一层（同步、事件循环内原子）：内存闸——临时 claim 必须先于任何 await，
  // 否则并发调用全部同步穿过检查点（实测 20× 全穿透）。
  // 双态缓存：{ts} = in-flight；{ts, terminal:true, result} = terminal 结果缓存。
  const mem = openclawMemClaims.get(taskId);
  if (mem) {
    if (mem.terminal) return { ...mem.result, already_done: true, done_at: mem.ts };
    return { task_id: taskId, status: "in_flight", raw_reply: null, elapsed_ms: null,
             error: "in-flight claim held (memory gate); no re-dispatch", in_flight: true };
  }
  openclawMemClaims.set(taskId, { ts: d.now() });

  // 第二层（持久，通过 withStorageLock 串行化，防止不同 taskId 并发写入时整对象互相覆盖）
  const durableCheck = await withStorageLock(async () => {
    const tasks = (await d.storageGet(storeKey))[storeKey] || {};
    const st = tasks[taskId];
    if (st && st.state === "IN_FLIGHT") {
      return { inFlight: true };
    }
    if (st && st.state === "TERMINAL") {
      return { terminal: true, st };
    }
    tasks[taskId] = { state: "IN_FLIGHT", ts: d.now() };
    await d.storageSet({ [storeKey]: tasks });
    return { ok: true };
  });

  if (durableCheck.inFlight) {
    openclawMemClaims.delete(taskId);
    return { task_id: taskId, status: "in_flight", raw_reply: null, elapsed_ms: null,
             error: "in-flight claim held (durable); no re-dispatch", in_flight: true };
  }
  if (durableCheck.terminal) {
    const st = durableCheck.st;
    openclawMemClaims.set(taskId, { ts: st.ts, terminal: true, result: st.result });
    return { ...st.result, already_done: true, done_at: st.ts };
  }

  const timeoutMs = Math.min(Math.max(Number(payload.timeout_ms) || 30000, 1000), 300000);

  // 派发前再次核查暂停状态，防止在等待持久化期间切为暂停引入的竞态
  if (getBridgeStatus) {
    const preDispatchStatus = await getBridgeStatus();
    if (!preDispatchStatus || preDispatchStatus.kill_switch_active !== false) {
      openclawMemClaims.delete(taskId);
      await withStorageLock(async () => {
        const tasks = (await d.storageGet(storeKey))[storeKey] || {};
        delete tasks[taskId];
        await d.storageSet({ [storeKey]: tasks });
      });
      return {
        task_id: taskId,
        status: "blocked",
        error: "Bridge paused before dispatch; OpenClaw task execution denied.",
        in_flight: false
      };
    }
  }

  let result;
  try {
    const response = await d.fetchFn("http://127.0.0.1:18766/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs + 8000),
    });
    result = await response.json();
  } catch (e) {
    result = { task_id: taskId, status: "failed", session_key: payload.session_key || null,
               raw_reply: null, elapsed_ms: null, error: String(e.message || e) };
  }

  await withStorageLock(async () => {
    const latest = (await d.storageGet(storeKey))[storeKey] || {};
    latest[taskId] = { state: "TERMINAL", result, ts: d.now() };
    const keys = Object.keys(latest);
    if (keys.length > 200) {
      keys.sort((a, b) => (latest[a].ts || "").localeCompare(latest[b].ts || ""));
      for (const k of keys.slice(0, keys.length - 200)) delete latest[k];
    }
    await d.storageSet({ [storeKey]: latest });
  });

  openclawMemClaims.set(taskId, { ts: d.now(), terminal: true, result }); // 内存缓存 terminal，后续重扫直接 already_done
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderUrl = sender.tab?.url || sender.url || "";
  const adapterProfile = globalThis.resolveChatAiAdapterProfile(senderUrl);
  const principal = adapterProfile?.principal || "folded-host-chatgpt-web";
  const isRestrictedMessagingPrincipal = ["qwen-theta-web", "doubao-heart-web", "glm-xingtu-web"].includes(principal);
  const isExtensionPage = senderUrl.startsWith(`chrome-extension://${chrome.runtime.id}/`);
  if (sender.id !== chrome.runtime.id || (!adapterProfile && !isExtensionPage)) {
    let locationHint = "unknown page";
    try {
      const parsed = new URL(senderUrl);
      locationHint = `${parsed.origin}${parsed.pathname}`;
    } catch {
      // Keep the failure diagnostic useful without trusting malformed sender metadata.
    }
    sendResponse({
      ok: false,
      error: `Sender origin denied: ${locationHint} is not in the pinned adapter allowlist.`,
    });
    return false;
  }

  (async () => {
    if (message.type === 'selector-update' || message.type === 'selector-version') {
      if (!isExtensionPage || senderUrl !== chrome.runtime.getURL('popup.html')) throw new Error('规则更新仅允许插件面板发起');
      const version=chrome.runtime.getManifest().version;
      if(message.type==='selector-update')return globalThis.SelectorUpdates.update(chrome.storage.local,version);
      try{const data=await globalThis.SelectorUpdates.cached(chrome.storage.local,version);return data?{version:data.meta.version,source:'cloud'}:globalThis.SelectorUpdates.BUILTIN}catch{return {...globalThis.SelectorUpdates.BUILTIN,warning:'缓存校验失败，使用内置规则'}}
    }
    // 方案 A 核心防线 1：登记当前 AI 标签页，并原生锁定为不可休眠
    if (sender.tab?.id && principal && !isExtensionPage) {
      registeredAiTabs.set(principal, sender.tab.id);
      chrome.tabs.update(sender.tab.id, { autoDiscardable: false }).catch(() => {});
    }

    if (message.type === "bridge-status") {
      return bridgeFetch("/api/v1/status", { method: "GET" }, principal);
    }
    if (message.type === "bridge-window-restore") {
      return bridgeFetch("/api/v1/window/restore", { method: "POST" }, "pocketfleet-popup-restore");
    }
    if (message.type === "bridge-launch-client") {
      if (message.originTabId) {
        lastOriginTabId = message.originTabId;
      }
      const launchUrl = chrome.runtime.getURL("launch.html");
      return new Promise((resolve) => {
        chrome.tabs.create({ url: launchUrl }, (tab) => {
          if (tab?.id) {
            pendingLaunchTabs.add(tab.id);
          }
          resolve({ ok: true, tabId: tab?.id });
        });
      });
    }
    if (message.type === "bridge-trigger-scheme") {
      return new Promise((resolve) => {
        chrome.tabs.create({ url: "pocketfleet://open" }, (tab) => {
          if (tab?.id) {
            pendingLaunchTabs.add(tab.id);
          }
          startSchemeRestorePolling();
          resolve({ ok: true, tabId: tab?.id });
        });
      });
    }
    if (message.type === "bridge-cleanup-launch-tabs") {
      cleanupLaunchTabs();
      return Promise.resolve({ ok: true });
    }
    if (message.type === "bridge-theta-status") {
      if (!isExtensionPage) {
        throw new Error("Theta status test is only permitted from extension pages.");
      }
      return bridgeFetch("/api/v1/status", { method: "GET" }, "qwen-theta-web");
    }
    if (message.type === "bridge-doubao-status") {
      if (!isExtensionPage) {
        throw new Error("Doubao status test is only permitted from extension pages.");
      }
      return bridgeFetch("/api/v1/status", { method: "GET" }, "doubao-heart-web");
    }
    if (message.type === "bridge-xingtu-status") {
      if (!isExtensionPage) {
        throw new Error("Xingtu status test is only permitted from extension pages.");
      }
      return bridgeFetch("/api/v1/status", { method: "GET" }, "glm-xingtu-web");
    }
    if (message.type === "bridge-tools") {
      return bridgeFetch("/api/v1/tools", { method: "GET" }, principal);
    }
    if (message.type === "bridge-access-roots-update") {
      if (!isExtensionPage) {
        throw new Error("Access roots can only be changed from the extension popup.");
      }
      return bridgeFetch("/api/v1/access-roots", {
        method: "PUT",
        body: JSON.stringify({
          read_roots: message.readRoots,
          write_roots: message.writeRoots,
          meeting_dir: message.meetingDir || null,
        }),
      });
    }
    if (message.type === "bridge-call") {
      if (isRestrictedMessagingPrincipal) {
        throw new Error(principal === "qwen-theta-web"
          ? "Theta principal is restricted to codeai messaging; tools denied."
          : "Doubao principal is restricted to codeai messaging; tools denied.");
      }
      return bridgeFetch("/api/v1/call", {
        method: "POST",
        body: JSON.stringify(message.payload),
      }, principal);
    }
    if (message.type === "bridge-client-event") {
      return bridgeFetch("/api/v1/client-event", {
        method: "POST",
        body: JSON.stringify({ request_id: message.requestId, stage: message.stage }),
      }, principal);
    }
    if (message.type === "bridge-control") {
      if (!message.humanGesture || !["pause", "resume"].includes(message.action)) {
        throw new Error("Human Root control request denied.");
      }
      return bridgeFetch(`/api/v1/control/${message.action}`, {
        method: "POST",
        body: "{}",
      }, principal);
    }
    if (message.type === "bridge-codeai-pull" || message.type === "bridge-theta-pull") {
      throw new Error('Deliveries may only be consumed by the Worker scheduler.');
    }
    if (message.type === "bridge-codeai-ack" || message.type === "bridge-theta-ack") {
      const ackBody = { delivery_id: message.delivery_id };
      if (message.confirm_mode) {
        ackBody.confirm_mode = message.confirm_mode;
      }
      return bridgeFetch("/api/v1/codeai/ack", {
        method: "POST",
        body: JSON.stringify(ackBody),
      }, principal);
    }
    if (message.type === "bridge-codeai-post" || message.type === "bridge-theta-post") {
      return bridgeFetch("/api/v1/codeai/post", {
        method: "POST",
        body: JSON.stringify(message.payload),
      }, principal);
    }
    if (message.type === "bridge-outbound-trace") {
      return bridgeFetch("/api/v1/outbound-trace", {method:"POST",body:JSON.stringify(message.event)},principal);
    }
    if (message.type === "bridge-telegram-post") {
      const source = new URL(senderUrl);
      if (isExtensionPage || !message.payload?.delivery_id || message.payload.source_key !== source.origin + source.pathname + source.search) {
        throw new Error('Reply conversation identity mismatch.');
      }
      if (!await reserveTelegramPost(message.payload)) {
        throw new Error('Outbound already reserved; outcome may be unknown; not retried.');
      }
      return bridgeFetch("/api/v1/telegram/post", {
        method: "POST",
        body: JSON.stringify(message.payload),
      }, principal);
    }
    if (message.type === "bridge-openclaw-task") {
      return await handleOpenClawTask(message.payload || {});
    }
    if (message.type === "bridge-settings") {
      const current = await settings();
      return { autoRun: current.autoRun };
    }
    throw new Error("Unknown extension message.");
  })()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: String(error.message || error) }));
  return true;
});

// 方案 A 核心防线 2：Extension Service Worker 后台主动轮询中枢（免疫多标签页定时器冻结）
let isBackgroundPolling = false;
const contentRecoveryAttempts = new Map();

async function recoverMissingContentBridge(tabId, expectedUrl, error) {
  // Recover missing receivers only, never replace a live but busy/slow instance.
  if (!String(error?.message || error).includes("Receiving end does not exist")) return false;
  const previous = contentRecoveryAttempts.get(tabId);
  if (previous?.url === expectedUrl && Date.now() - previous.at < 30000) return false;
  const current = await chrome.tabs.get(tabId);
  if (current.url !== expectedUrl || current.discarded || current.status === "loading"
    || !globalThis.resolveChatAiAdapterProfile?.(current.url)) return false;
  contentRecoveryAttempts.set(tabId, { url: expectedUrl, at: Date.now() });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["selector_definitions.js", "adapter_profiles.js", "selector_engine.js", "selector_updates.js", "selector_client.js", "content_bundle.js"],
  });
  await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  return true;
}

chrome.tabs.onRemoved.addListener((tabId) => contentRecoveryAttempts.delete(tabId));

function tabMessageWithTimeout(tabId, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`tab ${tabId}: ${message.type} timed out`)), 5000);
    chrome.tabs.sendMessage(tabId, message).then(
      (result) => { clearTimeout(timer); resolve(result); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
async function backgroundPollWorker() {
  globalThis.PocketFleetStudioRunner?.poll();
  if (isBackgroundPolling) return;
  isBackgroundPolling = true;
  try {
    syncTrialCredentialWithBridge().catch(() => {});
    await pruneTelegramPostClaims();
    // Never let a last heartbeat select a conversation. Ambiguous brands do not pull.
    const allTabs = await chrome.tabs.query({});
    const groups = new Map();
    for (const tab of allTabs) {
      const profile = globalThis.resolveChatAiAdapterProfile?.(tab.url);
      if (!profile || !tab.id) continue;
      const group = groups.get(profile.principal) || [];
      group.push(tab); groups.set(profile.principal, group);
    }
    await Promise.allSettled(Array.from(groups.entries(), async ([principal, tabs]) => {
      const tabId = tabs.length === 1 ? tabs[0].id : null;
      try {
        if (tabs.length !== 1) {
          await bridgeFetch('/api/v1/delivery-status', {method:'POST',body:JSON.stringify({state:'blocked',reason:'ambiguous_brand_tabs'})},principal);
          return;
        }
        const tab = await chrome.tabs.get(tabId);
        if(globalThis.PocketFleetStudioTabs?.has(tabId))return;
        const studioLease=await chrome.storage.local.get('studio_tab_'+tabId);
        if(Number(studioLease['studio_tab_'+tabId])>Date.now())return;
        const sourceKey = new URL(tab.url).origin + new URL(tab.url).pathname + new URL(tab.url).search;
        if (globalThis.resolveChatAiAdapterProfile?.(tab.url)?.principal !== principal) {
          registeredAiTabs.delete(principal);
          return;
        }
        const parsedLandingUrl = new URL(tab.url);
        const profileId = globalThis.resolveChatAiAdapterProfile(tab.url)?.id;
        const brand = {
          'chatgpt-folded-host': 'chatgpt',
          'deepseek-remainder': 'deepseek',
          'claude-web': 'claude',
          'gemini-earth-sandbox': 'gemini',
          'qwen-theta': 'qwen',
          'qwen-theta-tongyi': 'qwen',
          'doubao-heart': 'doubao',
          'grok-web': 'grok'
        }[profileId];
        const isLanding = parsedLandingUrl.pathname === '/' || parsedLandingUrl.pathname === ''
          || (brand === 'gemini' && (parsedLandingUrl.pathname === '/app' || parsedLandingUrl.pathname === '/app/'))
          || (brand === 'doubao' && (parsedLandingUrl.pathname === '/chat' || parsedLandingUrl.pathname === '/chat/'))
          || (brand === 'claude' && parsedLandingUrl.pathname === '/new');

        if (isLanding && brand) {
          const status = await bridgeFetch('/api/v1/status', { method: 'GET' }, principal);
          if (status?.kill_switch_active || !status?.pending_deliveries?.some(d => d.brand === brand)) return;

          // 2026-10-17 指挥官指导：严守条件等待，持续检测侧边栏出现、展开并挂载出历史项
          let target = null;
          for (let attempt = 0; attempt < 10; attempt++) {
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: globalThis.discoverLatestConversation,
              args: [brand, tab.url]
            }).catch(() => null);
            target = results?.[0]?.result;
            if (target?.url) break;
            await new Promise(r => setTimeout(r, 500));
          }

          if (target?.url) {
            const current = await chrome.tabs.get(tabId);
            const destination = new URL(target.url);
            const routeAllowed = Boolean(
              (brand === 'chatgpt' && /^\/c\/[0-9a-zA-Z_-]+\/?$/.test(destination.pathname)) ||
              (brand === 'deepseek' && /^\/a\/chat\/s\/[0-9a-zA-Z_-]+\/?$/.test(destination.pathname)) ||
              (brand === 'claude' && /^\/chat\/[0-9a-zA-Z_-]+\/?$/.test(destination.pathname)) ||
              (brand === 'gemini' && /^\/app\/[0-9a-f]{16}\/?$/.test(destination.pathname)) ||
              (brand === 'qwen' && /^\/c\/[0-9a-zA-Z_-]+\/?$/.test(destination.pathname)) ||
              (brand === 'doubao' && /^\/chat\/[a-zA-Z0-9_-]+\/?$/.test(destination.pathname)) ||
              (brand === 'grok' && /^\/c\/[0-9a-zA-Z_-]+\/?$/.test(destination.pathname))
            );
            const bridge = await bridgeFetch('/api/v1/status', { method: 'GET' }, principal);
            if (current.url === tab.url && destination.origin === new URL(tab.url).origin && routeAllowed && bridge?.kill_switch_active === false) {
              console.log(`[PocketFleet Worker] 🎯 自动定位到最近历史对话轨: ${destination.href}，立即跳转！`);
              await chrome.tabs.update(tabId, { url: destination.href });
              return; // 跳转后退出当前轮次，等待页面在对话页就绪后自动拉取投递
            }
          }
          // 首页未定位到可靠普通历史会话：保留待办在 Go 队列，明确上报原因，绝不在首页拉取或自动新建会话
          await bridgeFetch("/api/v1/delivery-status", {
            method: "POST",
            body: JSON.stringify({
              state: "waiting_conversation_route",
              reason: target?.blocked || "latest_conversation_not_found_on_landing_page"
            })
          }, principal).catch(() => {});
          return;
        }

        try {
          await tabMessageWithTimeout(tabId, { type: "bridge-background-tick" });
        } catch (error) {
          if (!await recoverMissingContentBridge(tabId, tab.url, error)) throw error;
          await bridgeFetch("/api/v1/delivery-status", {
            method: "POST", body: JSON.stringify({ state: "blocked", reason: "content_bridge_reinjected" }),
          }, principal);
          // Let startup establish its route baseline; no delivery is consumed here.
          return;
        }
        const page = await tabMessageWithTimeout(tabId, { type: "bridge-content-status" });
        await bridgeFetch("/api/v1/delivery-status", { method: "POST", body: JSON.stringify({state: page?.ready ? "ready" : "blocked", reason: page?.reason || "no_page_status"}) }, principal).catch(() => {});
        if (!page?.ok || !page.ready) {
          console.warn("[PocketFleet Worker] page not ready", principal, page?.reason);
          return;
        }
        const resp = await bridgeFetch('/api/v1/codeai/pull?source_key='+encodeURIComponent(sourceKey), { method: "GET" }, principal);
        if (resp && resp.ok && resp.pending && resp.content) {
          console.log(`[PocketFleet Worker] 🚀 收到投递，主动唤醒后台标签页 ${tabId} (principal: ${principal})`);
          chrome.tabs.sendMessage(tabId, {
            type: "bridge-push-delivery",
            delivery: resp,
            principal: principal,
            sourceKey,
          }).then((result) => {
            bridgeFetch("/api/v1/delivery-status", {method:"POST",body:JSON.stringify({state: result?.ok && result.processed ? "submitted" : "submission_failed", reason: result?.error || "", delivery_id:resp.delivery_id})},principal).catch(()=>{});
            if (!result?.ok || !result.processed) {
              console.warn("[PocketFleet Worker] delivery not confirmed", resp.delivery_id, result?.error);
            }
          }).catch((error) => console.warn("[PocketFleet Worker] delivery failed", resp.delivery_id, String(error)));
        }
      } catch (err) {
        console.warn("[PocketFleet Worker] scheduling blocked", principal, String(err));
        await bridgeFetch("/api/v1/delivery-status", {method:"POST",body:JSON.stringify({state:"blocked",reason:String(err)})},principal).catch(()=>{});
        chrome.storage.local.set({ [`schedule_error_${principal}`]: {
          message: String(err), at: Date.now(), tabId,
        } }).catch(() => {});
      }
    }));
  } finally {
    isBackgroundPolling = false;
  }
}

// 每 3 秒执行一次 Service Worker 调度唤醒
setInterval(backgroundPollWorker, 3000);

// An MV3 worker can terminate. Alarms restart scheduling without an active AI tab.
const BACKGROUND_POLL_ALARM = "pocketfleet-background-poll";
async function ensureBackgroundAlarm() {
  if (!await chrome.alarms.get(BACKGROUND_POLL_ALARM)) {
    await chrome.alarms.create(BACKGROUND_POLL_ALARM, { periodInMinutes: 0.5 });
  }
}
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BACKGROUND_POLL_ALARM) backgroundPollWorker();
});
chrome.runtime.onStartup.addListener(() => { ensureBackgroundAlarm(); backgroundPollWorker(); });
chrome.runtime.onInstalled.addListener(() => { ensureBackgroundAlarm(); backgroundPollWorker(); });
ensureBackgroundAlarm().catch(console.warn);
