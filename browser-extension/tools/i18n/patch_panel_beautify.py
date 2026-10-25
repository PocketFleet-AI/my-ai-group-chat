# -*- coding: utf-8 -*-
"""浮层面板（content script 注入网页）美化补丁 —— 2026-10-13 游隼

背景：指挥官截图指出浏览器页面里的桥接浮层也要美化。
此前弹窗（popup）与接力页（launch.html）已按蓝调玻璃层工艺基线重做，
本补丁把浮层面板拉到同一工艺基线，但保留其绿色身份
（页内桥梁 = 在线就绪，与扩展内蓝色表面区分）。

改动：
  1. content.js 面板模板：
     - 主按钮「暂停执行/恢复执行」单列全宽 + 图标（暂停条⇄播放三角），
       data-mode 切换；标签移入 [data-control-label]（renderStatus 同步改）。
     - 次级双列：重新检测（刷新图标）/ 重试回传（回退箭头图标）。
     - 「协同说明」降为最低频的一行（quiet）。
     - 版本号 v0.8.3 仅为兜底静态值，创建后由 chrome.runtime.getManifest 动态覆写。
  2. content.css：状态着色（connected/warning/disconnected）、图标、层级、
     入场微动效（reduced-motion 守护）、focus-visible。

约束：仓库文件为 CRLF；所有锚点必须唯一（count==1）。
"""
import io
import os

raise SystemExit("Retired after content split. Edit content_panel.js/content.css and run tools/build-content.cjs.")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, "content.js")
CSS = os.path.join(ROOT, "content.css")


def read_text(path):
    with io.open(path, "r", encoding="utf-8", newline="") as f:
        return f.read().replace("\r\n", "\n")


def write_crlf(path, text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text.replace("\n", "\r\n"))


def replace_once(text, old, new, label):
    n = text.count(old)
    assert n == 1, "锚点 [%s] 命中 %d 次，应为 1 次" % (label, n)
    return text.replace(old, new)


OLD_TEMPLATE = '''    root.innerHTML = `
    <div class="bridge-heading">
      <span class="bridge-mark" aria-hidden="true"><span class="bridge-light"></span>PF</span>
      <div>
        <strong>PocketFleet Bridge <small class="bridge-version" style="font-size:10px;opacity:0.8;font-weight:normal;">v0.8.0</small></strong>
        <span class="bridge-kicker">AI STARFLEET LINK</span>
      </div>
      <button class="bridge-collapse-toggle" type="button" data-action="collapse" title="收起浮层" aria-label="收起浮层">收起</button>
    </div>
    <div class="bridge-connection"><span class="bridge-status-dot"></span><span data-connection></span></div>
    <div class="bridge-activity"><span>最近动作</span><p data-activity></p></div>
    <div class="bridge-actions">
      <button class="bridge-primary" type="button" data-action="control" data-control>暂停执行</button>
      <button type="button" data-action="retry" data-retry disabled>重试回传</button>
      <button type="button" data-action="check">重新检测</button>
      <button type="button" data-action="instructions">协同说明</button>
    </div>
    <div class="bridge-collapsed-bar" data-action="expand" title="展开 PocketFleet Bridge 浮层">
      <span class="bridge-status-dot"></span>
      <span class="bridge-collapsed-label">PF 桥</span>
      <span class="bridge-expand-icon">◀</span>
    </div>
    `;'''

NEW_TEMPLATE = '''    root.innerHTML = `
    <div class="bridge-heading">
      <span class="bridge-mark" aria-hidden="true"><span class="bridge-light"></span>PF</span>
      <div class="bridge-titles">
        <strong>PocketFleet Bridge</strong>
        <span class="bridge-kicker">AI STARFLEET LINK <small class="bridge-version">v0.8.3</small></span>
      </div>
      <button class="bridge-collapse-toggle" type="button" data-action="collapse" title="收起浮层" aria-label="收起浮层">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 14 12 8 18 14"></polyline></svg>
        收起
      </button>
    </div>
    <div class="bridge-connection"><span class="bridge-status-dot"></span><span data-connection></span></div>
    <div class="bridge-activity">
      <span class="bridge-activity-label"><svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" aria-hidden="true"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"></path></svg>最近动作</span>
      <p data-activity></p>
    </div>
    <div class="bridge-actions">
      <button class="bridge-primary" type="button" data-action="control" data-control data-mode="pause">
        <svg class="ico-pause" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.4"></rect><rect x="14" y="4.5" width="4" height="15" rx="1.4"></rect></svg>
        <svg class="ico-play" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.4-6.8c.6-.4.6-1.4 0-1.8L9.6 4.3C8.9 3.9 8 4.4 8 5.2z"></path></svg>
        <span data-control-label>暂停执行</span>
      </button>
      <div class="bridge-actions-row">
        <button type="button" data-action="check">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          重新检测
        </button>
        <button type="button" data-action="retry" data-retry disabled>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
          重试回传
        </button>
      </div>
      <button class="bridge-quiet" type="button" data-action="instructions">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        协同说明
      </button>
    </div>
    <div class="bridge-collapsed-bar" data-action="expand" title="展开 PocketFleet Bridge 浮层">
      <span class="bridge-status-dot"></span>
      <span class="bridge-collapsed-label">PF 桥</span>
      <span class="bridge-expand-icon">◀</span>
    </div>
    `;'''

OLD_RENDER = '''  const control = root.querySelector("[data-control]");
  const retry = root.querySelector("[data-retry]");
  if (control) {
    control.textContent = killSwitchActive ? "恢复执行" : "暂停执行";
    control.disabled = killSwitchActive === null;
  }'''

NEW_RENDER = '''  const control = root.querySelector("[data-control]");
  const controlLabel = root.querySelector("[data-control-label]");
  const retry = root.querySelector("[data-retry]");
  if (control) {
    control.disabled = killSwitchActive === null;
    control.dataset.mode = killSwitchActive ? "resume" : "pause";
  }
  if (controlLabel) {
    controlLabel.textContent = killSwitchActive ? "恢复执行" : "暂停执行";
  }'''

OLD_APPEND = '''    document.body.appendChild(root);
    newlyCreated = true;'''

NEW_APPEND = '''    document.body.appendChild(root);
    newlyCreated = true;
    try {
      const manifestVersion = chrome.runtime?.getManifest?.().version;
      const versionNode = root.querySelector(".bridge-version");
      if (manifestVersion && versionNode) versionNode.textContent = "v" + manifestVersion;
    } catch {}'''

NEW_CSS = '''/* PocketFleet Web Bridge — 网页内浮层面板（content script 注入）
   v2 美化（2026-10-13 游隼）：保留绿色身份（页内桥梁 = 在线就绪），
   对齐弹窗/接力页工艺基线：主按钮单列全宽、图标语义、状态着色、入场微动效。
   契约不可动：PANEL_ID / .bridge-* 类名 / data-action / data-connection /
   data-activity / data-control(-label) / data-retry / data-state / data-collapsed。 */

#folded-host-bridge-panel {
  position: fixed;
  top: 96px;
  right: 20px;
  z-index: 2147483647;
  width: min(286px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 13px 14px 14px;
  overflow: hidden;
  border: 1px solid rgba(26, 72, 55, 0.14);
  border-radius: 16px;
  background:
    radial-gradient(circle at 100% 0%, rgba(48, 151, 103, 0.10), transparent 42%),
    linear-gradient(165deg, #fefffb 0%, #f0f6f0 100%);
  color: #17332a;
  box-shadow: 0 16px 44px rgba(14, 38, 29, 0.16), 0 2px 8px rgba(14, 38, 29, 0.06);
  font: 13px/1.45 "Microsoft YaHei UI", "Noto Sans SC", sans-serif;
  animation: bridge-panel-in 0.35s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
@keyframes bridge-panel-in {
  from { opacity: 0; transform: translateX(14px); }
  to { opacity: 1; transform: none; }
}

/* ---------- 顶栏：徽标 + 标题/版本 + 收起 ---------- */
#folded-host-bridge-panel .bridge-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
#folded-host-bridge-panel .bridge-mark {
  position: relative;
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 11px;
  background: linear-gradient(145deg, #143f2e, #1f7350);
  color: #f7f2dc;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.16), 0 2px 6px rgba(16, 60, 42, 0.22);
  font: 700 12px/1 Georgia, serif;
  letter-spacing: 0.06em;
}
#folded-host-bridge-panel .bridge-light {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  border: 2px solid #fefffb;
  border-radius: 50%;
  background: #c28a16;
}
#folded-host-bridge-panel .bridge-titles {
  flex: 1 1 auto;
  min-width: 0;
}
#folded-host-bridge-panel .bridge-titles strong {
  display: block;
  color: #123f31;
  font: 700 14.5px/1.2 Georgia, "Noto Serif SC", serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 版本号做成徽章放在 tagline 行：标题行宽度不足以并排（实测会溢出） */
#folded-host-bridge-panel .bridge-kicker {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: #6d8579;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  white-space: nowrap;
  overflow: hidden;
}
#folded-host-bridge-panel .bridge-version {
  flex: 0 0 auto;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(23, 51, 42, 0.07);
  color: #4f6f5f;
  font: 600 9px/1.3 -apple-system, "Segoe UI", sans-serif;
  letter-spacing: 0.02em;
}
#folded-host-bridge-panel .bridge-collapse-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  margin-left: auto;
  border: 1px solid rgba(26, 72, 55, 0.14);
  border-radius: 7px;
  padding: 3px 7px;
  background: rgba(255, 255, 255, 0.66);
  color: #1a4837;
  font: 600 10.5px/1.2 "Microsoft YaHei UI", "Noto Sans SC", sans-serif;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
#folded-host-bridge-panel .bridge-collapse-toggle:hover {
  background: #fff;
  border-color: rgba(26, 72, 55, 0.3);
}

/* ---------- 连接状态行：按状态整体着色 ---------- */
#folded-host-bridge-panel .bridge-connection {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 11px 0 9px;
  padding: 7px 10px;
  border: 1px solid rgba(28, 91, 66, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  color: #2f4a40;
  font-size: 11.5px;
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}
#folded-host-bridge-panel .bridge-connection > span:last-child {
  min-width: 0;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
#folded-host-bridge-panel .bridge-status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #c28a16;
  box-shadow: 0 0 0 3px rgba(194, 138, 22, 0.14);
}
#folded-host-bridge-panel[data-state="connected"] .bridge-light,
#folded-host-bridge-panel[data-state="connected"] .bridge-status-dot {
  background: #1a8a57;
  box-shadow: 0 0 0 3px rgba(26, 138, 87, 0.15);
}
#folded-host-bridge-panel[data-state="connected"] .bridge-connection {
  background: rgba(233, 245, 238, 0.92);
  border-color: rgba(26, 138, 87, 0.2);
}
#folded-host-bridge-panel[data-state="warning"] .bridge-light,
#folded-host-bridge-panel[data-state="warning"] .bridge-status-dot {
  background: #c28a16;
  box-shadow: 0 0 0 3px rgba(194, 138, 22, 0.14);
}
#folded-host-bridge-panel[data-state="warning"] .bridge-connection {
  background: rgba(255, 247, 228, 0.94);
  border-color: rgba(194, 138, 22, 0.28);
  color: #6b5310;
}
#folded-host-bridge-panel[data-state="disconnected"] .bridge-light,
#folded-host-bridge-panel[data-state="disconnected"] .bridge-status-dot {
  background: #bd3f36;
  box-shadow: 0 0 0 3px rgba(189, 63, 54, 0.14);
}
#folded-host-bridge-panel[data-state="disconnected"] .bridge-connection {
  background: rgba(253, 235, 231, 0.94);
  border-color: rgba(189, 63, 54, 0.22);
  color: #7c3325;
}
#folded-host-bridge-panel[data-state="checking"] .bridge-status-dot {
  animation: folded-host-pulse 1.2s ease-in-out infinite;
}
@keyframes folded-host-pulse {
  50% { opacity: 0.35; }
}

/* ---------- 最近动作卡：左绿 accents + 闪电标签 ---------- */
#folded-host-bridge-panel .bridge-activity {
  padding: 8px 10px;
  border-left: 3px solid #4e9a72;
  border-radius: 0 10px 10px 0;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 1px 4px rgba(14, 38, 29, 0.05);
}
#folded-host-bridge-panel .bridge-activity-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
  color: #6d8579;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
#folded-host-bridge-panel .bridge-activity-label svg {
  color: #4e9a72;
}
#folded-host-bridge-panel .bridge-activity p {
  margin: 0;
  color: #17332a;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

/* ---------- 动作区：主按钮单列全宽 + 次级双列 + 低频说明 ---------- */
#folded-host-bridge-panel .bridge-actions {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}
#folded-host-bridge-panel .bridge-actions-row {
  display: flex;
  gap: 6px;
}
#folded-host-bridge-panel .bridge-actions-row > button {
  flex: 1 1 0;
  min-width: 0;
}
#folded-host-bridge-panel button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(26, 72, 55, 0.16);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.8);
  color: #1c4a37;
  cursor: pointer;
  font: 600 11px/1.2 "Microsoft YaHei UI", "Noto Sans SC", sans-serif;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
#folded-host-bridge-panel button svg {
  flex: 0 0 auto;
}
#folded-host-bridge-panel button:hover {
  background: #fff;
  border-color: rgba(26, 72, 55, 0.32);
}
#folded-host-bridge-panel button:focus-visible {
  outline: 2px solid #2e8b62;
  outline-offset: 1px;
}
#folded-host-bridge-panel button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
#folded-host-bridge-panel button:disabled:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(26, 72, 55, 0.16);
}

/* 主按钮（熔断）：绿色 = 可暂停；暂停后转蓝 = 可恢复（与弹窗 resume 语义一致） */
#folded-host-bridge-panel button.bridge-primary {
  width: 100%;
  height: 34px;
  border-color: transparent;
  background: linear-gradient(150deg, #1f7a53, #14603f);
  color: #fffdf4;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(18, 92, 60, 0.26);
}
#folded-host-bridge-panel button.bridge-primary:hover {
  background: linear-gradient(150deg, #24845c, #17684a);
  border-color: transparent;
}
#folded-host-bridge-panel button.bridge-primary[data-mode="resume"] {
  background: linear-gradient(150deg, #3b82f6, #1f5fd4);
  box-shadow: 0 3px 10px rgba(31, 95, 212, 0.26);
}
#folded-host-bridge-panel button.bridge-primary[data-mode="resume"]:hover {
  background: linear-gradient(150deg, #2f74e8, #1a54bd);
}
#folded-host-bridge-panel button.bridge-primary:disabled {
  background: linear-gradient(150deg, #b9cdc2, #a7bdb1);
  box-shadow: none;
}
#folded-host-bridge-panel button.bridge-primary .ico-play { display: none; }
#folded-host-bridge-panel button.bridge-primary[data-mode="resume"] .ico-play { display: block; }
#folded-host-bridge-panel button.bridge-primary[data-mode="resume"] .ico-pause { display: none; }

/* 低频说明行：最静的一档 */
#folded-host-bridge-panel button.bridge-quiet {
  width: 100%;
  height: 28px;
  border-color: rgba(26, 72, 55, 0.1);
  background: transparent;
  color: #5f7a6d;
  font-size: 10.5px;
  font-weight: 600;
}
#folded-host-bridge-panel button.bridge-quiet:hover {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(26, 72, 55, 0.2);
  color: #1c4a37;
}

/* ---------- 收起态：右侧竖条 ---------- */
#folded-host-bridge-panel[data-collapsed="true"] {
  right: 0 !important;
  width: 38px !important;
  min-width: 38px !important;
  padding: 12px 6px !important;
  border-radius: 12px 0 0 12px !important;
  border-right: none !important;
  cursor: pointer;
  box-shadow: -3px 6px 20px rgba(14, 38, 29, 0.18) !important;
  animation: none !important;
}
#folded-host-bridge-panel[data-collapsed="true"] .bridge-heading,
#folded-host-bridge-panel[data-collapsed="true"] .bridge-connection,
#folded-host-bridge-panel[data-collapsed="true"] .bridge-activity,
#folded-host-bridge-panel[data-collapsed="true"] .bridge-actions {
  display: none !important;
}
#folded-host-bridge-panel .bridge-collapsed-bar {
  display: none;
}
#folded-host-bridge-panel[data-collapsed="true"] .bridge-collapsed-bar {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  user-select: none;
}
#folded-host-bridge-panel[data-collapsed="true"] .bridge-collapsed-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  font-weight: 700;
  color: #123f31;
  letter-spacing: 2px;
}
#folded-host-bridge-panel[data-collapsed="true"] .bridge-expand-icon {
  font-size: 10px;
  color: #245441;
}

@media (max-width: 720px) {
  #folded-host-bridge-panel {
    top: 72px;
    right: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #folded-host-bridge-panel { animation: none !important; }
  #folded-host-bridge-panel *,
  #folded-host-bridge-panel *::before,
  #folded-host-bridge-panel *::after { transition: none !important; }
}
'''


def main():
    src = read_text(CONTENT)
    src = replace_once(src, OLD_TEMPLATE, NEW_TEMPLATE, "panel template")
    src = replace_once(src, OLD_RENDER, NEW_RENDER, "renderStatus control")
    src = replace_once(src, OLD_APPEND, NEW_APPEND, "version sync")
    write_crlf(CONTENT, src)
    write_crlf(CSS, NEW_CSS)
    print("[OK] content.js patched (template + renderStatus + version sync)")
    print("[OK] content.css rewritten (v2 beautify)")


if __name__ == "__main__":
    main()
