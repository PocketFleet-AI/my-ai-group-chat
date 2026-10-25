/**
 * PocketFleet Web Bridge — popup controller (UI layer, v4)
 *
 * Scope: 界面接线 + 状态文案 + 多语言。
 * 不触碰 background.js / content.js / 签名校验 / 投递逻辑。
 */

const endpoint = document.querySelector("#endpoint");
const token = document.querySelector("#token");
const toggleTokenVisibility = document.querySelector("#toggleTokenVisibility");
const status = document.querySelector("#status");
const executionControl = document.querySelector("#executionControl");
const executionControlLabel = document.querySelector("#executionControlLabel");
// 熔断按钮图标随状态切换：省略号（检测中）/ 暂停双竖条（可暂停）/ 播放三角（已暂停可恢复）。
// 原先只换文案不换图标，状态切换时图标恒为暂停条，视觉上与实际状态矛盾。
const EXEC_ICONS = {
  checking: '<circle cx="5.4" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="18.6" cy="12" r="1.7"></circle>',
  pause: '<rect x="6.6" y="5.4" width="3.6" height="13.2" rx="1.2"></rect><rect x="13.8" y="5.4" width="3.6" height="13.2" rx="1.2"></rect>',
  resume: '<path d="M8 5.6 19 12 8 18.4z"></path>'
};
function setExecutionIcon(kind) {
  const svg = executionControl.querySelector("#executionControlIco");
  if (svg) svg.innerHTML = EXEC_ICONS[kind] || EXEC_ICONS.pause;
}
const startCollaborationProtocol = document.querySelector("#startCollaborationProtocol");
const primaryAction = document.querySelector("#primaryAction");
const offlineNote = document.querySelector("#offlineNote");
const statusBadge = document.querySelector("#statusBadge");
const statusBadgeText = document.querySelector("#statusBadgeText");
const statusHint = document.querySelector("#statusHint");
const killSwitchHint = document.querySelector("#killSwitchHint");
const langToggle = document.querySelector("#langToggle");
const langMenu = document.querySelector("#langMenu");
const langCurrent = document.querySelector("#langCurrent");
// v3 状态呈现分工：顶栏只留色点，状态卡承担文字与桥主体名，黄色块承担「下一步」
const brandLogo = document.querySelector("#brandLogo");
const heroState = document.querySelector("#heroState");
const heroDot = document.querySelector("#heroDot");
const heroSubject = document.querySelector("#heroSubject");
const stateCard = document.querySelector("#stateCard");
const nextNoteBody = document.querySelector("#nextNoteBody");

const CONTENT_PROTOCOL_VERSION = "unified-telegram-v1";

/* ---------------- i18n ---------------- */

const SUPPORTED_LOCALES = ["en", "zh_CN", "ja", "ko", "fr", "de", "es", "pt"];
const LOCALE_ENDONYMS = {
  en: "English",
  zh_CN: "简体中文",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
};
const MORE_LOCALES = ["fr", "de", "es", "pt"];
const LANG_PREF_KEY = "pf_ui_locale";

/**
 * 语言旗标（内联 SVG，不引外链图、不联网）。
 * 简化为色带/十字特征，用于快速识别，不追求国徽级还原。
 */
const LOCALE_FLAGS = {
  en: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" stroke-width="3"/><path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.6"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5"/><path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="3"/></svg>`,
  zh_CN: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#DE2910"/><path d="m5 2.6.8 2.1h2.2L6.3 6l.8 2.1L5 6.8 3.9 8.1 4.7 6 3.2 4.7h2.2z" fill="#FFDE00"/><circle cx="3.6" cy="10.4" r=".9" fill="#FFDE00"/><circle cx="5.4" cy="12" r=".9" fill="#FFDE00"/><circle cx="7.2" cy="13.2" r=".9" fill="#FFDE00"/><circle cx="3.8" cy="13.8" r=".9" fill="#FFDE00"/></svg>`,
  ja: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="5" fill="#BC002D"/></svg>`,
  ko: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/><path d="M12 4.2a3.8 3.8 0 0 1 0 7.6 3.8 3.8 0 0 1 0-7.6z" fill="#CD2E3A"/><path d="M5.6 4.6a3.8 3.8 0 0 1 0 6.8 3.8 3.8 0 1 1 0-6.8z" fill="#0047A0" transform="rotate(-33 7.5 8)"/><path d="M18.4 4.6a3.8 3.8 0 0 1 0 6.8 3.8 3.8 0 1 1 0-6.8z" fill="#0047A0" transform="rotate(33 16.5 8)"/><path d="M5 2h4l-2 2zM5 2v4l2-2zM19 2h-4l2 2zM19 2v4l-2-2zM5 14h4l-2-2zM5 14v-4l2 2zM19 14h-4l2-2zM19 14v-4l-2 2z" fill="#000"/></svg>`,
  fr: `<svg viewBox="0 0 24 16"><rect width="8" height="16" fill="#002395"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ED2939"/></svg>`,
  de: `<svg viewBox="0 0 24 16"><rect width="24" height="5.34" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#DD0000"/><rect y="10.66" width="24" height="5.34" fill="#FFCE00"/></svg>`,
  es: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#AA151B"/><rect y="4" width="24" height="8" fill="#F1BF00"/></svg>`,
  pt: `<svg viewBox="0 0 24 16"><rect width="9.6" height="16" fill="#046A38"/><rect x="9.6" width="14.4" height="16" fill="#DA291C"/><circle cx="9.6" cy="8" r="2.6" fill="#FFE900"/></svg>`,
};

function renderFlag(target, locale) {
  if (!target) return;
  target.innerHTML = LOCALE_FLAGS[locale] || LOCALE_FLAGS.en;
}

let messageTable = {};
let fallbackTable = {};
let extensionUpdateState = { key: "updateNotChecked" };
let ruleUpdateState = { key: "updateNotChecked" };

function renderUpdateVersions() {
  for (const [id, state] of [["latestExtVersion", extensionUpdateState], ["latestRuleVersion", ruleUpdateState]]) {
    document.querySelector("#" + id).textContent = state.version || t(state.key);
  }
}

/** 按所选 locale 加载文案表；缺失 key 回退 default_locale(en)，绝不抛错。 */
async function loadMessageTables(locale) {
  const read = async (code) => {
    try {
      const res = await fetch(chrome.runtime.getURL(`_locales/${code}/messages.json`));
      return res.ok ? await res.json() : {};
    } catch {
      return {};
    }
  };
  fallbackTable = await read("en");
  messageTable = locale === "en" ? {} : await read(locale);
}

/** 文案取值：选中语言 → English → 内置兜底。 */
function t(key, fallback) {
  const hit = messageTable[key]?.message ?? fallbackTable[key]?.message;
  if (hit) return hit;
  try {
    const value = chrome?.i18n?.getMessage(key);
    if (value) return value;
  } catch {}
  return fallback !== undefined ? fallback : key;
}

function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const text = t(node.dataset.i18n, node.textContent);
    if (text) node.textContent = text;
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const text = t(node.dataset.i18nTitle, node.title);
    if (text) {
      node.title = text;
      node.setAttribute("aria-label", text);
    }
  });
  renderUpdateVersions();
}

const DEFAULT_LOCALE = "en";

async function resolveLocale() {
  try {
    const stored = await chrome.storage.local.get({ [LANG_PREF_KEY]: "" });
    if (stored[LANG_PREF_KEY] && SUPPORTED_LOCALES.includes(stored[LANG_PREF_KEY])) {
      return stored[LANG_PREF_KEY];
    }
  } catch {}
  // 指挥官要求缺省英语：不跟随浏览器语言。
  return DEFAULT_LOCALE;
}

function renderLangMenu(activeLocale) {
  langCurrent.textContent = LOCALE_ENDONYMS[activeLocale] || LOCALE_ENDONYMS.en;
  renderFlag(document.querySelector("#langFlag"), activeLocale);
  const items = SUPPORTED_LOCALES.filter((code) => !MORE_LOCALES.includes(code));
  const moreItems = MORE_LOCALES;
  langMenu.textContent = "";
  const makeItem = (code) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-item";
    button.dataset.locale = code;
    const flag = document.createElement("span");
    flag.className = "flag";
    flag.setAttribute("aria-hidden", "true");
    renderFlag(flag, code);
    button.appendChild(flag);
    const label = document.createElement("span");
    label.textContent = LOCALE_ENDONYMS[code];
    button.appendChild(label);
    if (code === activeLocale) {
      button.setAttribute("aria-selected", "true");
      const tick = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      tick.setAttribute("class", "tick");
      tick.setAttribute("viewBox", "0 0 24 24");
      tick.setAttribute("width", "14");
      tick.setAttribute("height", "14");
      tick.setAttribute("fill", "none");
      tick.setAttribute("stroke", "currentColor");
      tick.setAttribute("stroke-width", "2.4");
      tick.setAttribute("stroke-linecap", "round");
      tick.setAttribute("stroke-linejoin", "round");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M4 12l5 5L20 6");
      tick.appendChild(path);
      button.appendChild(tick);
    }
    button.addEventListener("click", async () => {
      await chrome.storage.local.set({ [LANG_PREF_KEY]: code });
      await loadMessageTables(code);
      applyStaticI18n();
      renderLangMenu(code);
      setLangMenuOpen(false);
      renderCurrentState();
      await refreshRuleVersion().catch((error) => {
        document.querySelector("#aboutRuleVersionDetail").textContent = t("rulesReadFailed") + error.message;
      });
    });
    return button;
  };
  items.forEach((code) => langMenu.appendChild(makeItem(code)));
  const moreWrap = document.createElement("div");
  moreWrap.className = "lang-more-list";
  moreItems.forEach((code) => moreWrap.appendChild(makeItem(code)));
  const moreToggle = document.createElement("button");
  moreToggle.type = "button";
  moreToggle.className = "lang-more";
  moreToggle.textContent = t("langMore", "More…");
  moreToggle.addEventListener("click", () => moreWrap.classList.toggle("open"));
  langMenu.appendChild(moreToggle);
  langMenu.appendChild(moreWrap);
}

function setLangMenuOpen(open) {
  langMenu.hidden = !open;
  langToggle.setAttribute("aria-expanded", String(open));
}

langToggle.addEventListener("click", () => setLangMenuOpen(langMenu.hidden));
document.addEventListener("click", (event) => {
  if (!langMenu.hidden && !event.target.closest(".lang-wrap")) setLangMenuOpen(false);
});

/* ---------------- 状态呈现 ---------------- */

function setBadge(state, textKey, hintKey) {
  statusBadge.dataset.state = state;
  statusBadgeText.textContent = t(textKey, textKey);

  // 状态卡承担状态文字 + 桥主体名 + 「下一步」提示语（合并为一处，
  // 保证展开下方折叠区、按钮被顶出视口时，提示仍在可见区内）
  heroState.textContent = t(textKey, textKey);
  heroDot.dataset.state = state;
  nextNoteBody.textContent = t(hintKey, hintKey);
  stateCard.dataset.tone = state === "paused" || state === "offline" ? "rose" : "ok";

  // logo：离线降饱和，不靠文字也能看出
  brandLogo.dataset.offline = state === "offline" ? "1" : "0";

  currentView.badge = [state, textKey, hintKey];
}

/** 桥主体名（如 PocketFleetV2-Native），排障关键信息。 */
function setHeroSubject(name) {
  heroSubject.textContent = name || "";
}

/** 记录当前视图态，供切换语言后原样重绘（文案键而非成品字符串）。 */
let currentView = { badge: ["checking", "stateChecking", "stateCheckingHint"], killSwitch: null, offlineNote: false, output: ["idle", "neverTested"] };

/**
 * 输出行。
 * @param tone ok|warn|err|idle
 * @param textOrKey 文案键或成品串；成品串（如桥返回的错误详情）不参与语言重绘。
 * @param params 拼接在该文案键后面的动态尾巴（如 error.message）。
 */
function setOutput(tone, textOrKey, params) {
  const isKey = Object.prototype.hasOwnProperty.call(fallbackTable, textOrKey);
  const text = isKey ? t(textOrKey) + (params || "") : textOrKey;
  status.dataset.tone = tone;
  status.textContent = text;
  currentView.output = isKey ? [tone, textOrKey, params] : [tone, text];
}

/** 语言切换后重绘：把已渲染的成品文案换回 key 再走 t()。 */
function renderCurrentState() {
  setBadge(...currentView.badge);
  if (currentView.offlineNote) {
    applyOfflineView(currentView.badge[2]);
  } else if (currentView.killSwitch !== null) {
    renderExecutionControl(currentView.killSwitch);
  }
  offlineNote.hidden = !currentView.offlineNote;
  setOutput(...currentView.output);
  primaryAction.dataset.action = currentView.offlineNote ? "retry" : "open";
  primaryAction.textContent = t(currentView.offlineNote ? "retry" : "openClient");
}

document.querySelector("#extensionVersion").textContent = "v" + chrome.runtime.getManifest().version;

/* ---------------- 规则版本 ---------------- */

async function refreshRuleVersion() {
  const r = await chrome.runtime.sendMessage({ type: "selector-version" });
  if (!r.ok) throw Error(r.error);
  const source = r.data.source === "cloud" ? t("rulesSourceCloud", "云端配置") : t("rulesSourceLocal", "内置");
  let text = `${r.data.version}（${source}）`;
  let pageText = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const page = await chrome.tabs.sendMessage(tab.id, { type: "selector-page-version" });
      if (page?.version) {
        pageText = `；${t("rulesCurrentPage", "当前页")}：${page.version}${page.pending ? t("rulesPending", "（等待空闲更新）") : ""}`;
      }
    }
  } catch {}
  document.querySelector("#aboutRuleVersionDetail").textContent = text + pageText;
  const aboutRule = document.querySelector("#aboutRuleVersion");
  if (aboutRule) aboutRule.textContent = `${r.data.version} · ${source}`;
  document.querySelector("#currentRuleVersion").textContent = r.data.version;
}

/**
 * 规则更新失败时区分两类：
 * - 规则要求更高版本插件 ⇒ 明确提示先升级插件，而不是笼统的「更新失败」。
 * - 其余失败（网络/签名/哈希）⇒ 原样回报。
 */
function ruleUpdateErrorText(message) {
  const incompatible = /版本不兼容|min_extension_version|incompatible/i.test(String(message));
  const detail = t("rulesUpdateFailed", "更新失败，原配置保留：") + message;
  return incompatible ? t("rulesNeedNewerExtension", "该规则要求更新版本的插件，请先「检查插件更新」；原配置保留：") + message : detail;
}

document.querySelector("#checkRuleUpdate").addEventListener("click", async (event) => {
  if (!event.isTrusted) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const r = await chrome.runtime.sendMessage({ type: "selector-update" });
    if (!r.ok) throw Error(r.error);
    await refreshRuleVersion();
    ruleUpdateState = r.data.version ? { version: r.data.version } : { key: "updateUnknown" };
    renderUpdateVersions();
    // 后台返回 messageKey（i18n key）而非成品文案，由本侧 t() 翻译，
    // 这样切换语言时能重绘；旧版本后台返回 message 时回退到它。
    setOutput("ok", r.data.messageKey || r.data.message);
  } catch (e) {
    ruleUpdateState = { key: "updateCheckFailed" };
    renderUpdateVersions();
    setOutput("err", ruleUpdateErrorText(e.message));
  } finally {
    button.disabled = false;
  }
});

/**
 * 插件程序更新检查：商店安装版由 Chrome 自更新机制处理，本地内测版（unpacked）无法自更新。
 * 2026-10-13 指挥官定：不做手动按钮（两种形态下都装不上，属死按钮），
 * 改为打开弹窗时静默检查一次，让「最新版本」列有真实内容。
 */
async function checkExtensionUpdateOnce() {
  try {
    const version = chrome.runtime.getManifest().version;
    document.querySelector("#aboutExtVersion").textContent = `v${version}`;
    const requestUpdateCheck = chrome.runtime.requestUpdateCheck;
    if (typeof requestUpdateCheck !== "function") {
      extensionUpdateState = { key: "updateUnknown" };
      renderUpdateVersions();
      return;
    }
    const result = await requestUpdateCheck.call(chrome.runtime);
    // UpdateCheckDetails.status: no_update | update_available | throttled
    const status = result && result.status;
    if (status === "update_available") {
      extensionUpdateState = result.version ? { version: "v" + result.version } : { key: "extUpdateAvailable" };
    } else if (status === "throttled") {
      extensionUpdateState = { key: "extUpdateThrottled" };
    } else if (status === "no_update") {
      extensionUpdateState = { key: "updateNoNewVersion" };
    } else {
      extensionUpdateState = { key: "updateUnknown" };
    }
  } catch {
    extensionUpdateState = { key: "updateCheckFailed" };
  }
  renderUpdateVersions();
}

checkExtensionUpdateOnce();

/* ---------------- 令牌显隐 ---------------- */

if (toggleTokenVisibility) {
  toggleTokenVisibility.addEventListener("click", () => {
    const isPassword = token.type === "password";
    token.type = isPassword ? "text" : "password";
    const eyeSlash = toggleTokenVisibility.querySelector(".eye-closed");
    if (eyeSlash) eyeSlash.style.display = isPassword ? "inline" : "none";
    const label = isPassword ? t("hideToken", "隐藏令牌") : t("showToken", "显示令牌");
    toggleTokenVisibility.setAttribute("title", label);
    toggleTokenVisibility.setAttribute("aria-label", label);
  });
}

/* ---------------- 现有按钮接线（逻辑不变） ---------------- */

async function ensureContentBridge(tab) {
  let statusResponse;
  try {
    statusResponse = await chrome.tabs.sendMessage(tab.id, { type: "bridge-content-status" });
  } catch {
    // Freshly loaded unpacked extension is not present in already-open tabs.
  }
  if (statusResponse?.ok) {
    if (statusResponse.protocolVersion !== CONTENT_PROTOCOL_VERSION) {
      throw new Error(t("staleScript", "当前聊天页运行旧版发信脚本，请刷新标签页后再试。"));
    }
    return statusResponse;
  }
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["selector_definitions.js", "adapter_profiles.js", "selector_engine.js", "selector_updates.js", "selector_client.js", "content_bundle.js"],
  });
  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["content.css"],
  });
  const injected = await chrome.tabs.sendMessage(tab.id, { type: "bridge-content-status" });
  if (!injected?.ok || injected.protocolVersion !== CONTENT_PROTOCOL_VERSION) {
    throw new Error(t("adapterNotReady", "页面适配器未就绪，请刷新当前聊天页签后重试。"));
  }
  return injected;
}

async function load() {
  let stored = await chrome.storage.local.get({
    endpoint: "http://127.0.0.1:18765",
    token: "",
  });
  if (!stored.token) {
    try {
      const res = await fetch(chrome.runtime.getURL("seed_token.json"));
      if (res.ok) {
        const seed = await res.json();
        if (seed?.token) {
          stored.token = seed.token.trim();
          if (seed.endpoint) stored.endpoint = seed.endpoint.trim();
          await chrome.storage.local.set({
            endpoint: stored.endpoint,
            token: stored.token,
          });
        }
      }
    } catch {}
  }
  endpoint.value = stored.endpoint;
  token.value = stored.token;
}

async function save() {
  const normalized = endpoint.value.replace(/\/$/, "");
  if (normalized !== "http://127.0.0.1:18765") {
    throw new Error(t("endpointLocked", "当前本地桥端点锁定为 http://127.0.0.1:18765"));
  }
  await chrome.storage.local.set({
    endpoint: normalized,
    token: token.value.trim(),
  });
  setOutput("ok", "saved");
}

function renderExecutionControl(killSwitchActive) {
  executionControl.disabled = false;
  executionControl.dataset.paused = String(killSwitchActive);
  executionControl.classList.toggle("resume", Boolean(killSwitchActive));
  executionControlLabel.textContent = killSwitchActive ? t("resume", "Resume") : t("pause", "Pause");
  setExecutionIcon(killSwitchActive ? "resume" : "pause");
  killSwitchHint.textContent = killSwitchActive
    ? t("killSwitchPaused", "当前已暂停，出站全部拦下")
    : t("killSwitchIdle", "控制本地桥接调用与出站放行");
  currentView.killSwitch = Boolean(killSwitchActive);
  currentView.offlineNote = false;
}

/**
 * 顶部徽章与执行开关必须同源。
 * 单独刷新执行按钮而不刷徽章，会出现「按钮已暂停、顶部仍显示已连接」的矛盾状态。
 */
function syncBadgeWithKillSwitch(killSwitchActive) {
  setBadge(
    killSwitchActive ? "paused" : "connected",
    killSwitchActive ? "statePaused" : "stateConnected",
    killSwitchActive ? "statePausedHint" : "stateConnectedHint"
  );
}

async function refreshBridgeStatus() {
  const response = await chrome.runtime.sendMessage({ type: "bridge-status" });
  if (!response.ok) throw new Error(response.error);
  renderExecutionControl(response.data.kill_switch_active);
  syncBadgeWithKillSwitch(response.data.kill_switch_active);
  // 桥主体名：优先用桥自报，回退到本地档案名。排障关键信息，不可为空。
  const subject = response.data.app_name || response.data.subject || "PocketFleetV2-Native";
  setHeroSubject(subject);
  // 元信息里的端点回显真实配置值（v3 的Endpoint 行）
  const ep = endpoint.value.replace(/\/$/, "");
  document.querySelector("#aboutEndpoint").textContent = ep;
  lastBridgeOnline = true;
  offlineNote.hidden = true;
  primaryAction.dataset.action = "open";
  primaryAction.textContent = t("openClient");
  return response.data;
}

document.querySelector("#save")?.addEventListener("click", () => {
  save().catch((error) => setOutput("err", error.message));
});

document.querySelector("#test").addEventListener("click", async () => {
  try {
    await save();
    if (!token.value.trim()) {
      setOutput("warn", "needToken");
      return;
    }
    const bridgeStatus = await refreshBridgeStatus();
    if (bridgeStatus.kill_switch_active) {
      setOutput("ok", "bridgePaused");
    } else {
      setOutput("ok", "bridgeOnline", `：${bridgeStatus.principal || "OK"}`);
    }
  } catch (error) {
    setOutput("err", "connectFailed", `：${error.message}`);
  }
});

executionControl.addEventListener("click", async (event) => {
  if (!event.isTrusted) return;
  executionControl.disabled = true;
  try {
    await save();
    const before = await refreshBridgeStatus();
    const action = before.kill_switch_active ? "resume" : "pause";
    const response = await chrome.runtime.sendMessage({
      type: "bridge-control",
      action,
      humanGesture: true,
    });
    if (!response.ok) throw new Error(response.error);
    const after = await refreshBridgeStatus();
    setOutput(after.kill_switch_active ? "warn" : "ok", after.kill_switch_active ? "execPaused" : "execResumed");
  } catch (error) {
    executionControl.disabled = false;
    setOutput("err", "toggleFailed", `：${error.message}`);
  }
});

startCollaborationProtocol.addEventListener("click", async (event) => {
  if (!event.isTrusted) return;
  startCollaborationProtocol.disabled = true;
  try {
    await save();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error(t("noTab", "未找到当前浏览器标签页。"));
    const contentStatus = await ensureContentBridge(tab);
    if (!contentStatus?.adapter) {
      throw new Error(t("unsupportedPage", "当前页面不是支持的 AI 聊天会话页。"));
    }
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "bridge-start-collaboration-protocol",
      humanGesture: true,
    });
    if (!response?.ok) throw new Error(response?.error || t("injectFailed", "协议说明注入失败。"));
    setOutput("ok", "protocolInjected");
  } catch (error) {
    setOutput("err", "injectFailedPrefix", `：${error.message}`);
  } finally {
    startCollaborationProtocol.disabled = false;
  }
});

/* ---------------- 主按钮：唤起客户端 / 重试 ---------------- */

/**
 * 主按钮双态：
 * - retry（离线）：重跑一次桥状态检测，成功即切到在线视图。
 * - open（在线）：调用本地桥的窗口唤起路由。该路由若客户端尚未落地，如实回报，不假装成功。
 */
async function launchViaCustomScheme() {
  let originTabId = null;
  try {
    if (chrome.tabs && chrome.tabs.query) {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      originTabId = currentTab?.id || null;
    }
  } catch {}
  try {
    const res = await chrome.runtime.sendMessage({ type: "bridge-launch-client", originTabId });
    if (res && res.ok) return;
  } catch {}
  try {
    const launchUrl = (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("launch.html") : "pocketfleet://open";
    if (chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: launchUrl });
      return;
    }
  } catch {}
  try {
    window.open(chrome.runtime.getURL("launch.html"), "_blank");
  } catch {
    try { window.location.href = "pocketfleet://open"; } catch {}
  }
}

primaryAction.addEventListener("click", async (event) => {
  if (!event.isTrusted) return;
  primaryAction.disabled = true;
  try {
    await save();
    if (!token.value.trim()) {
      setOutput("warn", "needToken");
      return;
    }
    if (primaryAction.dataset.action === "retry") {
      // 离线冷启动：触发系统协议 pocketfleet://open
      launchViaCustomScheme();
      setOutput("ok", "launchingClient");
      await new Promise((r) => setTimeout(r, 1800));
      try {
        const data = await refreshBridgeStatus();
        currentView.killSwitch = Boolean(data.kill_switch_active);
        currentView.offlineNote = false;
        offlineNote.hidden = true;
        primaryAction.dataset.action = "open";
        primaryAction.textContent = t("openClient", "打开 PocketFleet 窗口");
        setOutput("ok", currentView.killSwitch ? "bridgePaused" : "bridgeOnlineShort");
      } catch (error) {
        setOutput("warn", "offlineNote");
      }
      return;
    }
    let restored = false;
    try {
      const response = await chrome.runtime.sendMessage({ type: "bridge-window-restore" });
      if (response && response.ok) {
        restored = true;
      }
    } catch {}
    if (!restored) {
      try {
        const res = await fetch(`${endpoint.value.replace(/\/$/, "")}/api/v1/window/restore`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token.value.trim()}`,
            "X-Folded-Host-Extension-ID": (chrome.runtime && chrome.runtime.id) ? chrome.runtime.id : "",
          },
        });
        if (res.ok) {
          restored = true;
        }
      } catch {}
    }
    if (restored) {
      setOutput("ok", "clientRestored");
    } else {
      // 若 HTTP 唤起未通，自动触发 pocketfleet://open 冷启动保底
      launchViaCustomScheme();
      setOutput("ok", "launchingClient");
    }
  } catch (error) {
    setOutput("err", "restoreFailed", `：${error.message}`);
  } finally {
    primaryAction.disabled = false;
  }
});

const saveTokenBtn = document.querySelector("#saveTokenBtn");
if (saveTokenBtn && token) {
  saveTokenBtn.addEventListener("click", async () => {
    const val = (token.value || "").trim();
    if (!val) return;
    await chrome.storage.local.set({ token: val });
    saveTokenBtn.textContent = "Saved!";
    setTimeout(() => { saveTokenBtn.textContent = "Save"; }, 2000);
    try {
      const data = await refreshBridgeStatus();
      currentView.killSwitch = Boolean(data.kill_switch_active);
      primaryAction.dataset.action = "open";
      primaryAction.textContent = t("openClient", "打开 PocketFleet 窗口");
      setOutput("ok", currentView.killSwitch ? "bridgePaused" : "bridgeOnlineShort");
      startBridgePolling();
    } catch (e) {
      applyOfflineView("stateOfflineHint");
      setOutput("err", "detectFailed", `：${e.message}`);
    }
  });
}

/* ---------------- 桥存活轮询 ----------------
   缺陷（指挥官 2026-10-12 实机发现）：弹窗只在打开时检测一次桥状态，
   exe 关掉后弹窗仍显示「已连接」——因为没有复查，用户被误导。
   Chrome 弹窗关闭即销毁 DOM，所以「重开弹窗」等于重新检测，问题才消失。
   处置：打开期间每 3 秒复查一次；由「已连接 → 未连接」的跃迁判定方向，
   避免把暂停/离线来回抖动写进历史。 */

const BRIDGE_POLL_MS = 3000;
let bridgePollTimer = null;
let lastBridgeOnline = null;

/** 复查桥存活；只处理「在线→离线」的跃迁，不反向自动恢复（恢复须用户点重试）。 */
async function pollBridgeOnce() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "bridge-status" });
    const online = Boolean(response && response.ok);
    if (lastBridgeOnline === false && online) {
      // 从离线恢复到在线：用户可能刚手动启动了 exe，主动刷新一次
      await refreshBridgeStatus();
      setOutput("ok", "bridgeOnlineShort");
    } else if (lastBridgeOnline === true && !online) {
      applyOfflineView("stateOfflineHint");
      setOutput("err", "bridgeDisconnected");
    }
    lastBridgeOnline = online;
  } catch (_) {
    // sendMessage 本身失败（扩展上下文失效等）——不打扰用户，等下一次
  }
}

function startBridgePolling() {
  if (bridgePollTimer !== null) return;
  bridgePollTimer = setInterval(pollBridgeOnce, BRIDGE_POLL_MS);
}

function stopBridgePolling() {
  if (bridgePollTimer === null) return;
  clearInterval(bridgePollTimer);
  bridgePollTimer = null;
}

// 弹窗失焦/隐藏时停轮询（Chrome 里弹窗失焦即关闭，此处为防御）
window.addEventListener("blur", stopBridgePolling);
window.addEventListener("unload", stopBridgePolling);

/* ---------------- 启动 ---------------- */

function applyOfflineView(hintKey) {
  executionControl.disabled = true;
  executionControl.classList.remove("resume");
  executionControlLabel.textContent = t("pause", "Pause");
  setExecutionIcon("pause");
  killSwitchHint.textContent = t("killSwitchOffline", "连接后可用");
  setBadge("offline", "stateOffline", hintKey);
  offlineNote.hidden = false;
  lastBridgeOnline = false;
  // 离线：桥主体名不可知（显示—），端点标注 offline，颜色也由 setBadge 转灰
  setHeroSubject("");
  // 肉色块已并入状态卡（指挥官 2026-10-12：离线说三处是重复）。
  // 这里把「为什么按钮不能自己启动客户端」补进状态卡提示语尾部，避免信息丢失。
  nextNoteBody.textContent =
    t(hintKey, "Detecting the local bridge") + " " + t("offlineNote", "Please open PocketFleet first.");
  document.querySelector("#aboutEndpoint").textContent =
    endpoint.value.replace(/\/$/, "") + " · offline";
  currentView.offlineNote = true;
  currentView.killSwitch = null;
  primaryAction.dataset.action = "retry";
  primaryAction.textContent = t("retry", "重试连接");
}

async function bootstrap() {
  const locale = await resolveLocale();
  await loadMessageTables(locale);
  applyStaticI18n();
  renderLangMenu(locale);
  setBadge("checking", "stateChecking", "stateCheckingHint");
  document.querySelector("#aboutExtVersion").textContent = "v" + chrome.runtime.getManifest().version;
  refreshRuleVersion().catch((e) => {
    document.querySelector("#aboutRuleVersionDetail").textContent = t("rulesReadFailed", "版本读取失败：") + e.message;
  });

  await load();
  if (!token.value.trim()) {
    applyOfflineView("stateNoToken");
    setOutput("warn", "needToken");
    return;
  }
  try {
    const data = await refreshBridgeStatus();
    currentView.killSwitch = Boolean(data.kill_switch_active);
    primaryAction.dataset.action = "open";
    primaryAction.textContent = t("openClient", "打开 PocketFleet 窗口");
    setOutput("ok", currentView.killSwitch ? "bridgePaused" : "bridgeOnlineShort");
    // 打开期间持续复查桥存活（exe 可能被用户关掉）
    startBridgePolling();
  } catch (error) {
    applyOfflineView("stateOfflineHint");
    setOutput("err", "detectFailed", `：${error.message}`);
    startBridgePolling();
  }
}

bootstrap();
