// @content-section panel-view
let isPanelCollapsed = false;
try {
  isPanelCollapsed = typeof localStorage !== "undefined" && localStorage.getItem("folded_host_panel_collapsed") === "true";
} catch {}

function setPanelCollapsed(collapsed) {
  isPanelCollapsed = !!collapsed;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("folded_host_panel_collapsed", String(isPanelCollapsed));
    }
  } catch {}
  const root = typeof document !== "undefined" ? document.getElementById(PANEL_ID) : null;
  if (root) {
    root.dataset.collapsed = String(isPanelCollapsed);
  }
}

function panel() {
  if (retireIfSuperseded()) return null;
  let root = document.getElementById(PANEL_ID);
  let newlyCreated = false;
  if (!root) {
    root = document.createElement("section");
    root.id = PANEL_ID;
    root.dataset.collapsed = String(isPanelCollapsed);
    root.innerHTML = `
    <div class="bridge-heading">
      <span class="bridge-mark" aria-hidden="true"><span class="bridge-light"></span><img class="bridge-logo" alt="" width="22" height="22" /></span>
      <div class="bridge-titles">
        <strong>PocketFleet Bridge</strong>
        <span class="bridge-kicker">AI STARFLEET LINK <small class="bridge-version">v0.8.3</small></span>
      </div>
      <button class="bridge-collapse-toggle" type="button" data-action="collapse" data-i18n-title="panelCollapseTitle" title="Collapse the floating panel" aria-label="Collapse the floating panel">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 14 12 8 18 14"></polyline></svg>
        <span data-i18n="panelCollapse">Collapse</span>
      </button>
    </div>
    <div class="bridge-connection"><span class="bridge-status-dot"></span><span data-connection></span></div>
    <div class="bridge-activity">
      <span class="bridge-activity-label"><svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"></path></svg><span data-i18n="panelRecentActivity">Recent activity</span></span>
      <p data-activity></p>
    </div>
    <div class="bridge-actions">
      <div class="bridge-actions-row">
        <button class="bridge-primary" type="button" data-action="control" data-control data-mode="pause">
          <svg class="ico-pause" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.4"></rect><rect x="14" y="4.5" width="4" height="15" rx="1.4"></rect></svg>
          <svg class="ico-play" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.4-6.8c.6-.4.6-1.4 0-1.8L9.6 4.3C8.9 3.9 8 4.4 8 5.2z"></path></svg>
          <span data-control-label>Pause</span>
        </button>
        <button class="bridge-instr" type="button" data-action="instructions">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span data-i18n="panelInstructions">Convention</span>
        </button>
      </div>
      <div class="bridge-actions-row">
        <button type="button" data-action="check">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span data-i18n="panelRecheck">Recheck</span>
        </button>
        <button type="button" data-action="retry" data-retry disabled>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
          <span data-i18n="panelRetry">Retry</span>
        </button>
      </div>
    </div>
    <div class="bridge-collapsed-bar" data-action="expand" data-i18n-title="panelExpandTitle" title="Expand the PocketFleet Bridge panel">
      <span class="bridge-status-dot"></span>
      <span class="bridge-collapsed-label" data-i18n="panelCollapsedLabel">PF Bridge</span>
      <span class="bridge-expand-icon">◀</span>
    </div>
    `;
    document.body.appendChild(root);
    newlyCreated = true;
    try {
      const manifestVersion = chrome.runtime?.getManifest?.().version;
      const versionNode = root.querySelector(".bridge-version");
      if (manifestVersion && versionNode) versionNode.textContent = "v" + manifestVersion;
      const logoNode = root.querySelector(".bridge-logo");
      if (logoNode && chrome.runtime?.getURL) {
        logoNode.src = chrome.runtime.getURL("icons/pocketfleet-24.png");
      }
    } catch {}
    applyPanelI18n(root);
  }
  if (newlyCreated || !panelClaimed || root.dataset.bridgeOwner !== CONTENT_INSTANCE_ID) {
    root.dataset.bridgeOwner = CONTENT_INSTANCE_ID;
    panelClaimed = true;
    root.addEventListener("click", async (event) => {
      if (!bridgeInstanceActive || !ownsPanel(root) || !event.isTrusted) return;
      const action = event.target?.dataset?.action || event.target?.closest("[data-action]")?.dataset?.action;
      if (action === "collapse") { setPanelCollapsed(true); return; }
      if (action === "expand") { setPanelCollapsed(false); return; }
      if (root.dataset.collapsed === "true" && (event.target === root || event.target.closest(".bridge-collapsed-bar"))) {
        setPanelCollapsed(false);
        return;
      }
      if (action === "check") {
        releaseReplyLock("manual_recheck");
        await refreshStatus();
        const latest = messagesByRole("assistant").slice(-1)[0];
        if (latest) telegramExecutedElements.delete(latest);
        runPageScan();
      }
      if (action === "instructions") await handleInstructionsClick();
      if (action === "control") await toggleExecution();
      if (action === "retry") await retryDelivery();
    });
  }
  renderStatus(root);
  return root;
}

/** 把当前语言表应用到已渲染面板：静态 data-i18n 节点 + 强制重渲动态字段。 */
// @content-section panel-status
function renderStatus(root = null) {
  if (!root) {
    if (typeof document === "undefined") return;
    root = panel();
  }
  if (!root || !bridgeInstanceActive || !ownsPanel(root)) return;
  const renderSignature = JSON.stringify({
    connectionState,
    connectionKey,
    connectionDetail,
    activityMessage,
    activityWarning,
    killSwitchActive,
    hasPendingDelivery: pendingDelivery !== null,
  });
  if (root.dataset.renderSignature === renderSignature) return;
  root.dataset.renderSignature = renderSignature;
  root.dataset.state = connectionState;
  const conn = root.querySelector("[data-connection]");
  if (conn) conn.textContent = connectionText();
  const act = root.querySelector("[data-activity]");
  if (act) {
    act.textContent = activityMessage;
    act.style.color = activityWarning ? "#6f5c22" : "";
    act.style.fontWeight = activityWarning ? "700" : "";
  }
  const control = root.querySelector("[data-control]");
  const controlLabel = root.querySelector("[data-control-label]");
  const retry = root.querySelector("[data-retry]");
  if (control) {
    control.disabled = killSwitchActive === null;
    control.dataset.mode = killSwitchActive ? "resume" : "pause";
  }
  if (controlLabel) {
    controlLabel.textContent = panelT(killSwitchActive ? "panelResume" : "panelPause");
  }
  if (retry) {
    retry.disabled = pendingDelivery === null;
  }
}

/** 连接态改用「键 + 明细」存储：语言切换后重渲自动换语（字符串存了就越描越漂）。 */
function setConnectionKey(key, state = "checking", detail = "") {
  connectionKey = key;
  connectionDetail = detail || "";
  connectionState = state;
  renderStatus();
}
function connectionText() {
  const base = panelT(connectionKey);
  return connectionDetail ? base + connectionDetail : base;
}

function setActivity(message, { warning = false } = {}) {
  activityIsIdle = false;
  activityMessage = warning ? `⚠ ${message}` : message;
  activityWarning = warning;
  renderStatus();
}

