// @content-section submission-busy
function doubaoQueueIsPaused() {
  if (!isDoubao) return false;
  if (document.querySelector(structuralSelectors.doubaoPendingQueue)) {
    return true;
  }
  const pageText = document.body?.innerText || "";
  return pageText.includes("队列已暂停")
    || pageText.includes("按 Enter 发送队列中首条消息");
}

function doubaoConversationBusyReason(now = Date.now()) {
  if (!isDoubao) return null;
  if (doubaoQueueIsPaused()) return "queue_paused";
  if (generationIsVisible()) return "generating";
  const users = messagesByRole("user");
  const assistants = messagesByRole("assistant");
  const latestUser = users[users.length - 1] || null;
  const latestAssistant = assistants[assistants.length - 1] || null;
  if (latestUser && (!latestAssistant || (
    latestAssistant.compareDocumentPosition(latestUser) & Node.DOCUMENT_POSITION_FOLLOWING
  ))) return "awaiting_reply";
  if (latestAssistant) {
    const state = getOrCreateMessageState(latestAssistant, now);
    if (now - state.lastChangedAt < DOUBAO_RESPONSE_STABILITY_MS) return "reply_unstable";
  }
  return null;
}

async function reportDeliveryStage(requestId, stage) {
  try {
    await send({ type: "bridge-client-event", requestId, stage });
  } catch {
    // Delivery telemetry must never replace the visible recovery path.
  }
}

// @content-section submission-standard
async function submitDoubaoEditor(editor, requestId, onSubmitConfirmed = null) {
  const route = pageRouteKey();
  const expectedDraft = editorText(editor);
  const existingUserMessages = new Set(messagesByRole("user"));
  const existingAssistantMessages = new Set(messagesByRole("assistant"));
  const submittedMessage = () => messagesByRole("user").find(
    (message) => !existingUserMessages.has(message) && submittedTurnMatches(message, expectedDraft),
  );
  let sendButton = await waitFor(() => { assertSubmissionCurrent(editor, route, expectedDraft); return activeSubmitButton(editor); }, 5000);
  if (!sendButton) {
    throw new Error("SUBMISSION_UNCERTAIN: SUBMIT_UNCONFIRMED：豆包发送按钮未就绪，未发送 ACK。");
  }
  const submittedText = editorText(editor);
  const busyBeforeSubmit = doubaoConversationBusyReason();
  if (busyBeforeSubmit) {
    throw new Error(`DOUBAO_BUSY: ${busyBeforeSubmit}; 自动投递已停止，未发送 ACK。`);
  }
  await reportDeliveryStage(requestId, "submit_click_attempted");
  await refreshStatus();
  assertSubmissionCurrent(editor, route, expectedDraft);
  sendButton = activeSubmitButton(editor);
  if (!sendButton || !sendButton.isConnected || sendButton.disabled || sendButton.getAttribute("aria-disabled") === "true") {
    throw new Error("豆包发送按钮在状态刷新后未就绪，未提交；不自动重试。");
  }
  sendButton.click();
  const confirmedMessage = await waitFor(submittedMessage, DELIVERY_SUBMIT_TIMEOUT_MS);
  if (!confirmedMessage) {
    throw new Error("SUBMISSION_UNCERTAIN: SUBMIT_UNCONFIRMED：豆包未出现真实用户消息，未发送 ACK。");
  }
  pendingDelivery = null;
  renderStatus();
  await reportDeliveryStage(requestId, "submit_confirmed");
  if (typeof onSubmitConfirmed === "function") {
    const callbackConfirmed = await onSubmitConfirmed('user_message', confirmedMessage);
    if (callbackConfirmed === false) {
      throw new Error("CALLBACK_UNCONFIRMED: post-submit callback did not close");
    }
  }
  setActivity("结果已提交，等待 AI 响应...");

  const awakened = await waitFor(
    () => generationIsVisible()
      || messagesByRole("assistant").some((message) => !existingAssistantMessages.has(message)),
    DELIVERY_WAKE_TIMEOUT_MS,
  );
  if (!awakened) {
    await reportDeliveryStage(requestId, "wake_unconfirmed");
    throw new Error("SUBMISSION_UNCERTAIN: WAKE_UNCONFIRMED：消息已进入豆包，但未观察到 AI 响应启动。");
  }
  await reportDeliveryStage(requestId, "wake_confirmed");
}

function evaluateSubmitConfirmation({
  submittedMessage = null,
  generationVisibleBefore = false,
  submittedText = "",
  requestId = "",
  editorCleared = false,
  generationVisibleAfter = false,
}) {
  if (submittedMessage) {
    return { confirmed: true, path: "user_message" };
  }
  const draftMatched = Boolean(submittedText && requestId && submittedText.includes(requestId));
  if (!generationVisibleBefore && draftMatched && editorCleared && generationVisibleAfter) {
    return { confirmed: true, path: "rising_edge_fallback" };
  }
  if (!generationVisibleBefore && editorCleared && generationVisibleAfter) {
    return { confirmed: true, path: "rising_edge_fallback_cleared" };
  }
  return { confirmed: false, path: null };
}

async function submitEditor(editor, requestId, onSubmitConfirmed = null) {
  if (isDoubao) {
    return submitDoubaoEditor(editor, requestId, onSubmitConfirmed);
  }
  const route = pageRouteKey();
  const expectedDraft = editorText(editor);
  const existingUserMessages = new Set(messagesByRole("user"));
  const existingAssistantMessages = new Set(messagesByRole("assistant"));
  let button = null;
  // 2026-10-16 红队实证：insertIntoEditor 与首个按钮轮询在同一任务内背靠背执行，
  // ProseMirror 等富文本编辑器经 MutationObserver 异步同步、React 重渲染更晚，
  // 发送按钮在注入后必然仍短暂 disabled。先 settle 再轮询，把同步窗确定性地吸收掉。
  await sleep(200);
  for (let attempt = 0; attempt < Math.ceil(DELIVERY_SUBMIT_TIMEOUT_MS / 100); attempt += 1) {
    // 2026-10-16 恢复（泥蛇授权）：轮询即守卫——路由/暂停/草稿/节点连接任一变化立即取消，
    // 绝不带着过期状态下点击（browser_bridge 四种取消场景验收此项）。
    assertSubmissionCurrent(editor, route, expectedDraft);
    if (!routeBaselinePending) {
      button = activeSubmitButton(editor);
      if (button) break;
    }
    await sleep(100);
  }
  if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") {
    // 2026-10-16 恢复（泥蛇授权）：按钮未就绪＝明确失败，不继续尝试发送。
    // 旧行为静默跳过点击、走到 Enter 兜底，把「没发出去」伪装成「发了没确认」。
    throw new Error("发送按钮未在提交窗口内就绪，不自动重试。");
  }
  // 2026-10-16 恢复（泥蛇授权）：点击前刷新桥状态并复检——refreshStatus 可能揭示
  // pause/disconnected，复检失败即取消，宁可不发也不误发。
  await refreshStatus();
  assertSubmissionCurrent(editor, route, expectedDraft);
  for (let settleAttempt = 0; settleAttempt < 10; settleAttempt += 1) {
    button = activeSubmitButton(editor);
    if (button && button.isConnected && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
      break;
    }
    await sleep(100);
  }
  if (!button || !button.isConnected || button.disabled || button.getAttribute("aria-disabled") === "true") {
    throw new Error("发送按钮在状态刷新后未就绪，未提交；不自动重试。");
  }
  const submittedText = editorText(editor);
  const generationVisibleBefore = generationIsVisible();
  // 2026-10-16 恢复 dispatchPointerActivation（拆分回归修复）：958b43d 把此处降级为裸
  // button.click()，Gemini（Angular mat-icon-button）不响应合成 click ⇒ 注入成功但提交
  // 失败、消息滞留输入框（实时复现：11:57 点名 Gemini 注入未提交、ChatGPT/React 照常通）。
  // 泥蛇授权原文要求「保留……单次激活修复」——完整指针序列各一次，绝不与 click 叠加。
  reportDeliveryStage(requestId, "submit_click_attempted");
  try {
    dispatchPointerActivation(button);
  } catch (activationErr) {
    // 激活本身抛错 ⇒ 点击已发生、结果未知 ⇒ uncertain：绝不重播（防重复发送）
    throw new Error("SUBMISSION_UNCERTAIN: 提交激活抛错，结果未知，不重播: " + String(activationErr?.message || activationErr));
  }
  reportDeliveryStage(requestId, "submit_click_dispatched");
  // One activation only; delayed UI updates must not cause a second send.
  for (let attempt = 0; attempt < 40 && editorText(editor); attempt += 1) {
    await sleep(100);
  }
  // 2026-10-16 Enter 兜底补刀（游隼，test-7 余数算子实证）：按钮激活已派发但输入框
  // 4 秒仍未清空 ⇒ 该席提交路径不响应按钮激活（DeepSeek textarea：Enter 才是原生
  // 提交路径，dispatchPointerActivation 的指针序列对其无效——trace 实证 15:24:13
  // click_dispatched 后 35s submit_unconfirmed、消息滞留输入框）。
  // **结果驱动补刀，非时间盲补**：判据是「文字仍在」——文字已清空即已提交，不补
  // （杜绝双发）；文字仍在即未提交，Enter 为 textarea 类输入最高优先级原生提交
  // 路径（dispatchEnter 对 contenteditable 同样有效，是全席位通用安全网）。
  if (editorText(editor)) {
    dispatchEnter(editor);
    for (let attempt = 0; attempt < 40 && editorText(editor); attempt += 1) {
      await sleep(100);
    }
  }

  const submittedMessage = await waitFor(
    () => messagesByRole("user").find(
      (message) => !existingUserMessages.has(message) && submittedTurnMatches(message, submittedText),
    ),
    DELIVERY_SUBMIT_TIMEOUT_MS,
  );

  let submitConfirmed = false;
  let confirmMode = null;
  if (submittedMessage) {
    submitConfirmed = true;
    confirmMode = "user_message_match";
  } else {
    const editorCleared = (editorText(editor) || "").trim().length === 0;
    const risingEdgeObserved = await waitFor(
      () => generationIsVisible(),
      Math.min(DELIVERY_SUBMIT_TIMEOUT_MS, 10000),
    );
    const evaluation = evaluateSubmitConfirmation({
      submittedMessage: null,
      generationVisibleBefore,
      submittedText,
      requestId,
      editorCleared,
      generationVisibleAfter: Boolean(risingEdgeObserved),
    });
    submitConfirmed = evaluation.confirmed;
    if (submitConfirmed) {
      confirmMode = "fallback_generation_rising_edge";
    }
  }

  if (!submitConfirmed) {
    // 点击已发生 ⇒ uncertain：不得重播（processCodeAiDelivery 据此保留去重记账）
    throw new Error("SUBMISSION_UNCERTAIN: SUBMIT_UNCONFIRMED：未观察到真实用户消息或生成上升沿；可点击“重试回传”，工具不会重跑。");
  }
  pendingDelivery = null;
  renderStatus();
  await reportDeliveryStage(requestId, "submit_confirmed");
  const confirmedUserMessage = submittedMessage || messagesByRole("user").slice(-1)[0] || null;
  if (typeof onSubmitConfirmed === "function") {
    await onSubmitConfirmed(confirmMode, confirmedUserMessage);
  }
  setActivity("结果已提交，等待折叠主机响应...");

  const awakened = await waitFor(
    () => generationIsVisible()
      || messagesByRole("assistant").some((message) => !existingAssistantMessages.has(message)),
    DELIVERY_WAKE_TIMEOUT_MS,
  );
  if (!awakened) {
    await reportDeliveryStage(requestId, "wake_unconfirmed");
    // 消息已进对话（提交成功）只是未见响应启动 ⇒ uncertain：不得重播
    throw new Error("SUBMISSION_UNCERTAIN: WAKE_UNCONFIRMED：结果已进入对话，但未观察到折叠主机响应启动；请检查 ChatGPT 状态。");
  }
  await reportDeliveryStage(requestId, "wake_confirmed");
}

async function retryDelivery() {
  if (!pendingDelivery) return;
  const delivery = pendingDelivery;
  if (messagesByRole("user").some((message) => message.textContent.includes(delivery.requestId))) {
    pendingDelivery = null;
    renderStatus();
    setActivity("结果已存在于对话中，已取消重复回传");
    return;
  }
  try {
    setActivity("正在重试结果回传，不重复执行工具...");
    const editor = insertIntoEditor(delivery.text);
    await reportDeliveryStage(delivery.requestId, "retry_inserted");
    await submitEditor(editor, delivery.requestId);
    setActivity("回传已确认，折叠主机已唤醒");
  } catch (error) {
    setActivity(`NEEDS_HUMAN：${error.message}`);
  }
}

// 向 AI 重申「多AI协同交互规范」——浮层「协同说明」与弹窗「加载发信规范」
// 共用同一 code path（onMessage 只在外部门禁之后调用本函数），行为逐字一致：
// 取活白名单 → 组装规范全文 → 注入输入框并提交，等待 AI 回复「发信规范已加载」。
// @content-section submission-qwen
async function submitQwenEditor(editor, requestId, onSubmitConfirmed = null) {
  const route = pageRouteKey();
  const expectedDraft = editorText(editor);
  const existingUserMessages = new Set(qwenUserMessages());
  const existingAssistantMessages = new Set(qwenAssistantMessages());
  let button = null;
  for (let attempt = 0; attempt < Math.ceil(DELIVERY_SUBMIT_TIMEOUT_MS / 100); attempt += 1) {
    assertSubmissionCurrent(editor, route, expectedDraft);
    let scope = editor.parentElement;
    for (let depth = 0; scope && depth < 12 && !button; depth += 1) {
      button = readySubmitButton(scope);
      scope = scope.parentElement;
    }
    if (!button) {
      button = readySubmitButton(document);
    }
    if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") break;
    button = null;
    await sleep(100);
  }
  if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") {
    throw new Error("Qwen发送按钮未在提交窗口内就绪，不自动重试。");
  }
  await refreshStatus();
  assertSubmissionCurrent(editor, route, expectedDraft);
  const submittedText = (editor.value || "").trim();
  button.click();
  for (let attempt = 0; attempt < 10 && (editor.value || "").trim(); attempt += 1) {
    await sleep(100);
  }
  for (let attempt = 0; attempt < 40 && (editor.value || "").trim(); attempt += 1) {
    await sleep(100);
  }

  const submittedMessage = await waitFor(
    () => qwenUserMessages().find(
      (message) => !existingUserMessages.has(message) && submittedTurnMatches(message, submittedText),
    ),
    DELIVERY_SUBMIT_TIMEOUT_MS,
  );
  if (!submittedMessage) {
    throw new Error("SUBMISSION_UNCERTAIN: SUBMIT_UNCONFIRMED：未观察到真实用户消息；可点击“重试回传”，消息不会重跑。");
  }
  pendingDelivery = null;
  renderStatus();
  await reportDeliveryStage(requestId, "submit_confirmed");
  if (typeof onSubmitConfirmed === "function") {
    const callbackConfirmed = await onSubmitConfirmed('user_message', submittedMessage);
    if (callbackConfirmed === false) {
      throw new Error("CALLBACK_UNCONFIRMED: post-submit callback did not close");
    }
  }
  setActivity("结果已提交，等待 Qwen 思想体响应...");

  const awakened = await waitFor(
    () => qwenGenerationIsVisible()
      || qwenAssistantMessages().some((message) => !existingAssistantMessages.has(message)),
    DELIVERY_WAKE_TIMEOUT_MS,
  );
  if (!awakened) {
    await reportDeliveryStage(requestId, "wake_unconfirmed");
    throw new Error("SUBMISSION_UNCERTAIN: WAKE_UNCONFIRMED：结果已进入对话，但未观察到 Qwen 响应启动；请检查页面状态。");
  }
  await reportDeliveryStage(requestId, "wake_confirmed");
}

