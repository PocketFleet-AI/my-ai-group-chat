// @content-section dom-editor
function promptEditor() {
  const isExcluded = (el) => Boolean(
    el.closest("article, [data-testid*='turn'], [data-testid='chatgpt-writing-block'], .writing-block-editor, .markdown, [class*='turn-content']")
    || el.classList.contains("ql-clipboard")
    || el.getAttribute("tabindex") === "-1"
  );

  const pickBest = (list) => {
    const valid = list.filter((el) => !isExcluded(el));
    if (valid.length === 0) return null;
    const primary = valid.find((el) => el.classList.contains("ql-editor") || el.id === "prompt-textarea" || el.classList.contains("ProseMirror"));
    if (primary) return primary;
    return valid[valid.length - 1];
  };

  if (globalThis.SelectorEngine) {
    const list = globalThis.SelectorEngine.all(document, featureSelectors('editor'));
    const chosen = pickBest(list);
    if (chosen) return chosen;
  }
  for (const selector of featureSelectors('editor') || []) {
    try {
      const nodes = [...document.querySelectorAll(selector)];
      const chosen = pickBest(nodes);
      if (chosen) return chosen;
    } catch {}
  }
  return null;
}

function featureSelectors(key) {
  return globalThis.SelectorEngine?.selectors(adapterProfile, key) || adapterProfile?.selectors?.[key] || [];
}

function joinedSelectors(selectors) {
  return (selectors || []).join(", ");
}

function queryFirst(selectors, scope = document) {
  if (globalThis.SelectorEngine) return globalThis.SelectorEngine.first(scope, selectors);
  for (const selector of selectors || []) { const node = scope.querySelector(selector); if (node) return node; }
  return null;
}

function queryAll(selectors, scope = document) {
  if (globalThis.SelectorEngine) return globalThis.SelectorEngine.all(scope, selectors);
  const selector = joinedSelectors(selectors);
  return selector ? [...scope.querySelectorAll(selector)] : [];
}

function insertIntoEditor(text, allowOverwrite = false) {
  const editor = promptEditor();
  if (!editor) throw new Error("未找到当前 AI 输入框，页面适配器需要更新。");
  if (!allowOverwrite && editorText(editor)) throw new Error("输入框非空，为避免覆盖已停止自动回填。");
  editor.focus();
  const isTextArea = typeof HTMLTextAreaElement !== "undefined" && editor instanceof HTMLTextAreaElement;
  const isInput = typeof HTMLInputElement !== "undefined" && editor instanceof HTMLInputElement;
  if (isTextArea || isInput) {
    const prototype = isTextArea
      ? (window.HTMLTextAreaElement?.prototype || {})
      : (window.HTMLInputElement?.prototype || {});
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (nativeSetter) nativeSetter.call(editor, text);
    else editor.value = text;
    if (typeof Event !== "undefined") {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      editor.dispatchEvent({ type: "input" });
      editor.dispatchEvent({ type: "change" });
    }
    return editor;
  }
  // contenteditable / ProseMirror / Quill 富文本处理：通过 selectAll 全选与 execCommand/paste 注入，严禁粗暴清空 textContent
  let inserted = false;
  try {
    editor.focus();
    if (allowOverwrite) {
      document.execCommand("selectAll", false, null);
    }
    inserted = document.execCommand("insertText", false, text);
  } catch {}
  if (!inserted) {
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasteEvt = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      inserted = editor.dispatchEvent(pasteEvt);
    } catch {}
  }
  if (!inserted) {
    if (editor.classList && editor.classList.contains("ql-editor")) {
      const lines = text.split("\n");
      editor.innerHTML = lines
        .map((line) => `<p>${line ? line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<br>"}</p>`)
        .join("");
      inserted = true;
    } else {
      editor.textContent = text;
    }
  }
  if (typeof InputEvent !== "undefined") {
    editor.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: text }),
    );
  } else if (typeof Event !== "undefined") {
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (typeof Event !== "undefined") {
    try {
      editor.dispatchEvent(new CustomEvent("text-change", { bubbles: true }));
    } catch {}
  }
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      sel.collapseToEnd();
    }
  } catch {}
  return editor;
}

function editorText(editor) {
  if (!editor) return "";
  if ("value" in editor && typeof editor.value === "string") {
    return editor.value.trim();
  }
  if (editor.isContentEditable || editor.getAttribute("contenteditable") === "true") {
    if (editor.classList && editor.classList.contains("ql-blank")) {
      return "";
    }
    const clone = editor.cloneNode(true);
    clone.querySelectorAll("[aria-hidden='true']").forEach((el) => el.remove());
    // 剔除纯占位提示词节点，杜绝误判为用户草稿
    clone.querySelectorAll(".placeholder, [data-placeholder]").forEach((el) => {
      if (el.classList.contains("placeholder") || !el.textContent.trim()) {
        el.remove();
      }
    });
    let txt = (clone.textContent || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    const ph = editor.getAttribute("data-placeholder") || editor.querySelector("[data-placeholder]")?.getAttribute("data-placeholder");
    if (ph && txt === ph.trim()) {
      return "";
    }
    return txt;
  }
  return String(editor.textContent || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await sleep(100);
  }
  return null;
}

function messagesByRole(role) {
  // Gemini's generic response-container also matches empty auxiliary containers.
  // Prefer one canonical root per model turn rather than the last generic match.
  if (role === "assistant" && adapterProfile?.id === "gemini-earth-sandbox") {
    const roots = queryAll([structuralSelectors.geminiRoots]);
    if (roots.length) return roots.filter((node, i) => roots.indexOf(node) === i);
  }
  const selectors = featureSelectors(role === 'assistant' ? 'assistantMessages' : 'userMessages');
  const messages = queryAll(selectors);
  const userMessageSelector = joinedSelectors(featureSelectors('userMessages'));
  const safeMessages = messages.filter((message) => (
    (role === 'assistant' && userMessageSelector ? !message.closest(userMessageSelector) : true)
    && !message.closest("[contenteditable='true']")
    && !message.closest(`#${PANEL_ID}`)
  ));
  // 通用父子嵌套去重：若 A 包含了 B，剔除内层子节点，确保每个回复仅对应一个 DOM 根节点
  return safeMessages.filter((message) => (
    !safeMessages.some((other) => other !== message && other.contains(message))
  ));
}

function generationIsVisible() {
  return queryAll(featureSelectors('generation')).some(
    (candidate) => candidate.getClientRects().length > 0,
  );
}

// @content-section dom-activation
function isEligibleSubmitButton(candidate) {
  if (!candidate) return false;
  const isVisible = candidate.getClientRects().length > 0 || document.hidden || candidate.offsetWidth > 0 || candidate.offsetHeight > 0;
  if (!isVisible) return false;
  if (candidate.disabled || candidate.getAttribute("aria-disabled") === "true" || candidate.getAttribute("data-disabled") === "true") {
    return false;
  }
  if (candidate.classList && (candidate.classList.contains("ds-button--disabled") || candidate.classList.contains("disabled"))) {
    return false;
  }
  const label = (candidate.getAttribute("aria-label") || "").toLowerCase();
  const testId = (candidate.getAttribute("data-testid") || "").toLowerCase();
  if (label.includes("voice") || label.includes("speech") || label.includes("语音") || label.includes("麦克风") || label.includes("attach") || label.includes("附件") || label.includes("upload") || label.includes("dictat")) {
    return false;
  }
  if (testId.includes("voice") || testId.includes("speech") || testId.includes("attach") || testId.includes("stop")) {
    return false;
  }
  const text = (candidate.innerText || candidate.textContent || "").toLowerCase().trim();
  if (text.includes("深度思考") || text.includes("智能搜索") || text.includes("联网搜索") || text === "think" || text === "search") {
    return false;
  }
  return true;
}

function readySubmitButton(scope, predicate = isEligibleSubmitButton) {
  if (!scope) return null;
  for (const selector of featureSelectors('submit')) {
    try {
      const candidates = [...scope.querySelectorAll(selector)];
      const found = candidates.find(predicate);
      if (found) return found;
    } catch {}
  }
  try {
    const fallbackButtons = [...scope.querySelectorAll("form button, [class*='composer'] button, [data-composer-footer-responsive] button, [class*='ComposerLayoutFooter'] button, button[type='submit']")];
    // 2026-10-16 红队实证（根因修复）：此前的兜底含 `|| btn.querySelector("svg")` 通配，
    // 会命中输入区里任何带图标的按钮（ChatGPT 新 composer 的「＋添加文件」在文档序第一位）。
    // 当发送按钮因富文本异步同步而短暂 disabled 时，兜底把「＋」当发送按钮返回并点击，
    // 导致消息永不提交（附件菜单被打开）。兜底只认「确实是发送按钮」的特征标记，
    // 宁可在同步窗内返回 null 等待，也绝不点错按钮。
    const isSendLike = (btn) => Boolean(
      btn.type === "submit"
      || btn.querySelector("svg.icon-primary-action")
      || btn.classList.contains("bg-composer-primary")
      || (btn.getAttribute("data-testid") || "").toLowerCase().includes("send")
      || (btn.getAttribute("data-testid") || "").toLowerCase().includes("submit")
      || (btn.getAttribute("aria-label") || "").includes("发送")
      || (btn.getAttribute("aria-label") || "").includes("Send")
    );
    const found = fallbackButtons.find((btn) => predicate(btn) && isSendLike(btn));
    if (found) return found;
  } catch {}
  return null;
}

function activeSubmitButton(editor) {
  if (!editor) return null;
  let scope = editor.parentElement;
  for (let depth = 0; scope && depth < 12; depth += 1) {
    const nearby = readySubmitButton(scope);
    if (nearby) return nearby;
    scope = scope.parentElement;
  }
  return readySubmitButton(document);
}

function dispatchPointerActivation(button) {
  if (!button) return;
  // 单次有效激活：完整指针序列各一次。
  // 2026-10-16 红队实证：旧版连发约 4 次点击（MouseEvent click + button.click() +
  // svg 点击冒泡），在提交为异步的页面上同一条消息会多次发送（mock 实测 4 次提交）。
  const eventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
  };
  try { button.focus(); } catch {}
  button.dispatchEvent(new PointerEvent("pointerdown", eventInit));
  button.dispatchEvent(new MouseEvent("mousedown", eventInit));
  button.dispatchEvent(new PointerEvent("pointerup", { ...eventInit, buttons: 0 }));
  button.dispatchEvent(new MouseEvent("mouseup", { ...eventInit, buttons: 0 }));
  // 2026-10-16 原生 click 补全（游隼，据裁决者穿刺＋test-7 trace 实证）：
  // React 18 对 isTrusted:false 的合成 MouseEvent("click") 不可靠响应（事件委托层
  // 过滤）⇒ ChatGPT 注入成功、按钮就绪、合成事件派完，提交却不发生、消息滞留
  // 输入框（test-7 结算主机实时复现；QWen/Gemini 路径因 submitQwenEditor 裸 click
  // 命硬或 Angular 响应合成事件而未暴露）。原生 button.click() 仅产生单个 click
  // 事件、不重复 pointer/mouse 序列 ⇒ 与上方四个合成事件共同构成一次完整真实
  // 点击。旧版「4 连发」病根是多个 click 来源叠加（合成 click＋原生 click＋svg
  // 冒泡点击共 3-4 次提交，mock 实测），非原生 click 本身——此处以一换一，
  // 总激活次数不增，杜绝重复发送。
  button.click();
}

function dispatchEnter(editor) {
  if (!editor) return;
  try { editor.focus(); } catch {}
  try {
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch {}
  const opts = {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    charCode: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  };
  const target = editor.lastElementChild || editor;
  target.dispatchEvent(new KeyboardEvent("keydown", opts));
  target.dispatchEvent(new KeyboardEvent("keypress", opts));
  try {
    target.dispatchEvent(new InputEvent("beforeinput", {
      inputType: "insertParagraph",
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    }));
  } catch {}
  target.dispatchEvent(new KeyboardEvent("keyup", opts));
  editor.dispatchEvent(new KeyboardEvent("keydown", opts));
  editor.dispatchEvent(new KeyboardEvent("keyup", opts));
  const form = editor.closest("form");
  if (form && typeof form.requestSubmit === "function") {
    try { form.requestSubmit(); } catch {}
  }
}

// @content-section dom-qwen
function qwenEditor() {
  return queryFirst(featureSelectors('editor'));
}

function insertIntoQwenEditor(text) {
  const editor = qwenEditor();
  if (!editor) throw new Error("未找到 Qwen 输入框，页面适配器需要更新。");
  if (editor.value && editor.value.trim()) throw new Error("输入框非空，为避免覆盖已停止自动回填。");
  editor.focus();
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(editor, text);
  } else {
    editor.value = text;
  }
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  editor.dispatchEvent(new Event("change", { bubbles: true }));
  return editor;
}

function qwenUserMessages() {
  if (typeof document === "undefined") return [];
  return queryAll(featureSelectors('userMessages'));
}

function qwenAssistantMessages() {
  if (typeof document === "undefined") return [];
  return queryAll(featureSelectors('assistantMessages'));
}

function qwenGenerationIsVisible() {
  if (typeof document === "undefined") return false;

  // 1. Check for stop/pause buttons
  const stopCandidates = document.querySelectorAll(
    "button.stop-button, button[class*='stop'], button[aria-label*='Stop'], button[aria-label*='停止'], .anticon-pause, svg[class*='stop'], [data-icon='pause']"
  );
  for (const btn of stopCandidates) {
    const clickable = btn.closest("button") || btn;
    if ((clickable.getClientRects().length > 0 || clickable.offsetWidth > 0) && !clickable.disabled) {
      return true;
    }
  }

  // 2. Check for active (uncompleted) thinking status card
  const thinkingCards = document.querySelectorAll(".qwen-chat-tool-status-card");
  for (const card of thinkingCards) {
    if (!card.classList.contains("qwen-chat-thinking-status-card-completed") &&
        !card.className.includes("completed")) {
      return true;
    }
  }

  // 3. Check latest assistant message completion:
  // When Qwen is streaming, the message actions footer (with '重新生成' / 'Regenerate') is not yet mounted.
  const assistantList = queryAll(featureSelectors('assistantMessages'));
  if (assistantList && assistantList.length > 0) {
    const latest = assistantList[assistantList.length - 1];
    const root = latest.closest(".qwen-chat-message-assistant") || latest;
    const hasAnswer = root.querySelector(".response-message-content, .qwen-markdown, .custom-qwen-markdown");
    if (hasAnswer) {
      const hasRegenerate = root.querySelector(
        "button[aria-label*='重新生成'], button[aria-label*='Regenerate'], button[aria-label*='regenerate'], [class*='container-regenerate'], .qwen-chat-package-comp-new-action-control-icons"
      );
      if (!hasRegenerate) {
        return true;
      }
    }
  }

  return queryAll(featureSelectors('generation')).some(
    (candidate) => candidate.getClientRects().length > 0,
  );
}

// @content-section dom-visible-text
function isThinkingElement(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "details" || tag === "summary") return true;
  const className = typeof el.className === "string" ? el.className.toLowerCase() : "";
  if (/think|thought|reasoning|collapse/.test(className)) return true;
  const testId = (el.getAttribute && el.getAttribute("data-testid") || "").toLowerCase();
  if (/think|thought|reasoning/.test(testId)) return true;
  const role = (el.getAttribute && el.getAttribute("role") || "").toLowerCase();
  if (/think|thought|reasoning/.test(role)) return true;
  return false;
}

function isInsideThinking(node, root) {
  let cur = node.nodeType === 3 ? node.parentElement : node;
  while (cur && cur !== root) {
    if (isThinkingElement(cur)) return true;
    cur = cur.parentElement;
  }
  return false;
}

function isElementVisible(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.getAttribute && el.getAttribute("aria-hidden") === "true") return false;
  if (el.hidden) return false;
  const style = el.style;
  if (style && (style.display === "none" || style.visibility === "hidden")) return false;
  return true;
}

function isInsideHidden(node, root) {
  let cur = node.nodeType === 3 ? node.parentElement : node;
  while (cur && cur !== root) {
    if (!isElementVisible(cur)) return true;
    cur = cur.parentElement;
  }
  return false;
}

const BLOCK_TAGS = new Set([
  "P", "DIV", "PRE", "BLOCKQUOTE", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6",
  "TABLE", "TR", "TD", "TH", "SECTION", "ARTICLE", "HEADER", "FOOTER", "ASIDE", "NAV", "BR"
]);

function getEnclosingBlock(node, root) {
  let cur = node.nodeType === 3 ? node.parentElement : node;
  while (cur && cur !== root) {
    const tag = (cur.tagName || "").toUpperCase();
    if (BLOCK_TAGS.has(tag)) return cur;
    cur = cur.parentElement;
  }
  return root;
}

function findForbiddenAncestor(node, root) {
  let cur = node.nodeType === 3 ? node.parentElement : node;
  while (cur && cur !== root) {
    const tag = (cur.tagName || "").toLowerCase();
    if (tag === "pre" || tag === "code" || tag === "blockquote" || tag === "details" || tag === "summary") {
      return cur;
    }
    if (isThinkingElement(cur) || !isElementVisible(cur)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

function collectVisibleNonThinkingTextNodes(root) {
  const entries = [];
  function walk(node) {
    if (!node) return;
    if (node.nodeType === 1) {
      if (isThinkingElement(node) || !isElementVisible(node)) return;
      const children = node.childNodes && node.childNodes.length > 0 ? node.childNodes : (node.children || []);
      if (children.length === 0 && node.textContent && (!node.children || !node.children.length)) {
        entries.push({
          node: { nodeType: 3, nodeValue: node.textContent, parentElement: node },
          enclosingBlock: getEnclosingBlock(node, root),
        });
        return;
      }
      for (let i = 0; i < children.length; i++) {
        walk(children[i]);
      }
    } else if (node.nodeType === 3) {
      if (!isInsideThinking(node, root) && !isInsideHidden(node, root)) {
        entries.push({
          node,
          enclosingBlock: getEnclosingBlock(node, root),
        });
      }
    }
  }
  const rootChildren = root.childNodes && root.childNodes.length > 0 ? root.childNodes : (root.children || []);
  if (rootChildren.length === 0 && root.textContent) {
    entries.push({
      node: { nodeType: 3, nodeValue: root.textContent, parentElement: root },
      enclosingBlock: root,
    });
  } else {
    for (let i = 0; i < rootChildren.length; i++) {
      walk(rootChildren[i]);
    }
  }
  return entries;
}

// 兜底提取（P2 健壮性）：宏被 LLM 包进 pre/code 块时，主路径（要求宏顶格）会拒收。
// 此函数镜像 parseCodeAiMessage 的代码块扫描，对 theta_codeai_message 做同样容忍。
// 仅当块可见、不在思考/隐藏区时才提取，防止休眠示例被误执行。
// UUIDv4 闸：兜底路径较主路径宽松，必须更保守 —— 占位/示例 UUID（如 a1b2c3d4-…-7890-…，版本位 7）直接拒收，
// 仅放行符合舰队 message_id 惯例的真随机 UUIDv4。
// @content-section dom-actions
function truncateAtMessageActions(root) {
  if (!root || !root.querySelector) return;
  const selector = structuralSelectors?.messageActionBars ||
    ".message-action-button-main, [data-testid='message_action_copy'], [data-testid='audio_play_button'], [data-testid^='message_action_'], [class*='message-action']";
  const actionIndicator = root.querySelector(selector);
  if (!actionIndicator) return;

  // 豆包等页面的操作栏（复制、朗读、点赞、踩等）为回复结束点。
  // 操作栏及其后续渲染的所有关联问题、推荐引导问答、时间条统统切除。
  let current = actionIndicator;
  while (current && current.parentElement && current.parentElement !== root) {
    while (current.nextSibling) {
      current.nextSibling.remove();
    }
    current = current.parentElement;
  }
  if (current) {
    while (current.nextSibling) {
      current.nextSibling.remove();
    }
    current.remove();
  }
}

// @content-section dom-auto-select
function tryAutoSelectLatestSession() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const path = window.location.pathname || "";
    // 仅在根路径（未选择任何历史会话）时尝试
    if (path !== "/" && path !== "") return;

    const host = window.location.hostname || "";
    if (host.includes("deepseek.com")) {
      const checkAndClick = (attempt = 0) => {
        if (window.location.pathname !== "/" && window.location.pathname !== "") return;
        const candidates = document.querySelectorAll("a[href*='/a/chat/s/'], div[class*='history'] a, nav a[href*='/chat/']");
        for (const item of candidates) {
          const href = item.getAttribute("href") || "";
          if (href.includes("/a/chat/s/") && isElementVisible(item)) {
            console.log("[PocketFleet Bridge] 🎯 自动激活 DeepSeek 最新历史会话:", href);
            item.click();
            return;
          }
        }
        if (attempt < 4) {
          setTimeout(() => checkAndClick(attempt + 1), 1200);
        }
      };
      setTimeout(() => checkAndClick(0), 1000);
    }
  } catch (err) {
    console.warn("[PocketFleet Bridge] autoSelectLatestSession error:", err);
  }
}

