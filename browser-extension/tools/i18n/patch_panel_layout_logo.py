# -*- coding: utf-8 -*-
"""浮层面板 v4 补丁（2026-10-13 指挥官令）：
① 「协同说明」从底部静默行上移，与「暂停执行」并排（同一 actions-row）；
   点击行为改为与弹窗「加载发信规范」同一 code path（向 AI 重申完整协同规范）。
② 徽标改用真实品牌 logo 图片（chrome-extension:// 资源，src 运行时注入），
   替换此前的蓝渐变「PF」文字方块。
纪律：CRLF 归一化 + 锚点唯一性断言；只替换不重排其它代码。
"""
import io
import os
import sys

raise SystemExit("Retired after content split. Edit content_panel.js and run tools/build-content.cjs.")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, "content.js")


def replace_once(text, old, new, label):
    n = text.count(old)
    assert n == 1, f"anchor [{label}] expected 1 occurrence, got {n}"
    return text.replace(old, new)


def main():
    with io.open(CONTENT, "r", encoding="utf-8", newline="") as f:
        raw = f.read()
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    # ① 徽标：PF 文字方块 → 真实 logo 图片（src 由 panel() 运行时注入）
    text = replace_once(
        text,
        '<span class="bridge-mark" aria-hidden="true"><span class="bridge-light"></span>PF</span>',
        '<span class="bridge-mark" aria-hidden="true"><span class="bridge-light"></span>'
        '<img class="bridge-logo" alt="" width="22" height="22" /></span>',
        "mark-logo",
    )

    # ② 动作区重排：协同说明上移与主按钮并排，底部静默行移除
    old_actions = """    <div class="bridge-actions">
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
    </div>"""
    new_actions = """    <div class="bridge-actions">
      <div class="bridge-actions-row">
        <button class="bridge-primary" type="button" data-action="control" data-control data-mode="pause">
          <svg class="ico-pause" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.4"></rect><rect x="14" y="4.5" width="4" height="15" rx="1.4"></rect></svg>
          <svg class="ico-play" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.4-6.8c.6-.4.6-1.4 0-1.8L9.6 4.3C8.9 3.9 8 4.4 8 5.2z"></path></svg>
          <span data-control-label>暂停执行</span>
        </button>
        <button class="bridge-instr" type="button" data-action="instructions">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          协同说明
        </button>
      </div>
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
    </div>"""
    text = replace_once(text, old_actions, new_actions, "actions-layout")

    # ③ panel() 注入 logo src（chrome-extension:// 绝对地址，相对路径会解析到宿主网页）
    old_boot = """    try {
      const manifestVersion = chrome.runtime?.getManifest?.().version;
      const versionNode = root.querySelector(".bridge-version");
      if (manifestVersion && versionNode) versionNode.textContent = "v" + manifestVersion;
    } catch {}"""
    new_boot = """    try {
      const manifestVersion = chrome.runtime?.getManifest?.().version;
      const versionNode = root.querySelector(".bridge-version");
      if (manifestVersion && versionNode) versionNode.textContent = "v" + manifestVersion;
      const logoNode = root.querySelector(".bridge-logo");
      if (logoNode && chrome.runtime?.getURL) {
        logoNode.src = chrome.runtime.getURL("icons/pocketfleet-24.png");
      }
    } catch {}"""
    text = replace_once(text, old_boot, new_boot, "logo-src")

    # ④ 点击分发：insertInstructions（旧简版）→ handleInstructionsClick（完整规范重申）
    text = replace_once(
        text,
        '      if (action === "instructions") await insertInstructions();',
        '      if (action === "instructions") await handleInstructionsClick();',
        "action-dispatch",
    )

    # ⑤ 旧简版函数整体替换为：共享 code path + 浮层专用包装
    old_fn = """async function insertInstructions() {
  const instructions = [
    "【PocketFleet 多AI协同出站规范】",
    "• 当你在对话中向星舰战队其它席位或 Telegram 发信时，请在回复首行以规范头开头：",
    "  [Telegram]re:{收件席位} 回复内容...",
    "• 示例：",
    "  [Telegram]re:@AiSoulJudgeBot 代码审计已完成，基线无异常。",
    "• 浏览器扩展将自动识别发信指令并通过本地网桥无感转发至战队群！",
  ].join("\\n");
  try {
    insertIntoEditor(instructions);
    setActivity("协同发信规范说明已放入输入框");
  } catch (error) {
    setActivity(error.message);
  }
}"""
    new_fn = """// 向 AI 重申「多AI协同交互规范」——浮层「协同说明」与弹窗「加载发信规范」
// 共用同一 code path（onMessage 只在外部门禁之后调用本函数），行为逐字一致：
// 取活白名单 → 组装规范全文 → 注入输入框并提交，等待 AI 回复「发信规范已加载」。
async function injectCollaborationProtocol() {
  if (killSwitchActive) throw new Error("执行总开关已暂停。");
  if (generationIsVisible() || (isQwen && qwenGenerationIsVisible())) {
    throw new Error("当前 AI 正在生成回复，请等待结束后重试。");
  }
  const requestId = `codeai-bootstrap-${crypto.randomUUID()}`;
  const whitelist = await fetchCodeAiWhitelist();
  const prompt = collaborationProtocolBootstrap(requestId, whitelist);
  if (isQwen) {
    const editor = insertIntoQwenEditor(prompt);
    await submitQwenEditor(editor, requestId);
  } else {
    const editor = insertIntoEditor(prompt);
    await submitEditor(editor, requestId, null, { protocolVersion: CONTENT_PROTOCOL_VERSION });
  }
  return { ok: true, requestId };
}

async function handleInstructionsClick() {
  const button = typeof document !== "undefined"
    ? document.getElementById(PANEL_ID)?.querySelector('[data-action="instructions"]')
    : null;
  if (button?.dataset.busy === "1") return;
  if (button) {
    button.dataset.busy = "1";
    button.disabled = true;
  }
  try {
    setActivity("正在向 AI 重申发信规范...");
    await injectCollaborationProtocol();
    setActivity("已向 AI 重申发信规范，等待「发信规范已加载」回复");
  } catch (error) {
    setActivity(`NEEDS_HUMAN：${error.message}`);
  } finally {
    if (button) {
      button.dataset.busy = "";
      button.disabled = false;
    }
  }
}"""
    text = replace_once(text, old_fn, new_fn, "protocol-fn")

    # ⑥ onMessage 处理器的异步体改为调用共享函数（外部门禁保持不动）
    old_handler = """    (async () => {
      if (killSwitchActive) throw new Error("执行总开关已暂停。");
      if (generationIsVisible() || (isQwen && qwenGenerationIsVisible())) {
        throw new Error("当前 AI 正在生成回复，请等待结束后重试。");
      }
      const requestId = `codeai-bootstrap-${crypto.randomUUID()}`;
      const whitelist = await fetchCodeAiWhitelist();
      const prompt = collaborationProtocolBootstrap(requestId, whitelist);
      if (isQwen) {
        const editor = insertIntoQwenEditor(prompt);
        await submitQwenEditor(editor, requestId);
      } else {
        const editor = insertIntoEditor(prompt);
        await submitEditor(editor, requestId, null, { protocolVersion: CONTENT_PROTOCOL_VERSION });
      }
      return { ok: true, requestId };
    })()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error.message || error) }));
    return true;"""
    new_handler = """    injectCollaborationProtocol()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error.message || error) }));
    return true;"""
    text = replace_once(text, old_handler, new_handler, "message-handler")

    if crlf:
        text = text.replace("\n", "\r\n")
    with io.open(CONTENT, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print("[OK] content.js patched: mark-logo / actions-layout / logo-src / dispatch / protocol-fn / handler")


if __name__ == "__main__":
    sys.exit(main())
