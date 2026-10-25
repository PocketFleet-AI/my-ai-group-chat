// @content-section outbound-tools
async function executeCall(call) {
  if (killSwitchActive !== false) {
    setActivity(panelT("panelGuardBlocked"));
    return;
  }
  setActivity(`执行 ${call.tool}...`);
  try {
    const result = await send({
      type: "bridge-call",
      payload: {
        request_id: call.request_id,
        timestamp: Math.floor(Date.now() / 1000),
        tool: call.tool,
        arguments: call.arguments,
      },
    });
    if (!result || !result.ok) {
      throw new Error(result?.error || "工具调用未实现或返回失败");
    }
    const resultPrompt = [
      "[FOLDED_HOST_TOOL_RESULT]",
      JSON.stringify(result),
      "[/FOLDED_HOST_TOOL_RESULT]",
      "请基于真实工具结果继续；不要重复相同 request_id。",
    ].join("\n");
    pendingDelivery = { requestId: call.request_id, text: resultPrompt };
    renderStatus();
    await reportDeliveryStage(call.request_id, "result_received");
    if (killSwitchActive !== false) {
      throw new Error(panelT("panelGuardAbort"));
    }
    const editor = insertIntoEditor(resultPrompt);
    await reportDeliveryStage(call.request_id, "result_inserted");
    await submitEditor(editor, call.request_id);
    setActivity(`${call.tool} 已执行、提交并唤醒`);
  } catch (error) {
    await reportDeliveryStage(call.request_id, "delivery_failed");
    setActivity(`NEEDS_HUMAN：${error.message}`);
    await refreshStatus();
  }
}

async function scanCalls() {
  if (killSwitchActive !== false) return;
  for (const message of messagesByRole("assistant")) {
    if (executedMessages.has(message) || !hasBridgeHeader(message)) continue;
    const calls = callsFromMessage(message);
    if (calls.length === 0) continue;
    if (calls.length > 1) {
      executedMessages.add(message);
      setActivity(panelT("panelRejectMultiTool"));
      continue;
    }
    const [call] = calls;
    if (handled.has(call.request_id)) continue;
    handled.add(call.request_id);
    executedMessages.add(message);
    executeCall(call);
  }
}

// @content-section outbound-stability
function getOrCreateMessageState(message, now = Date.now()) {
  let state = messageStates.get(message);
  const signature = message.textContent || "";
  if (!state) {
    state = {
      signature,
      lastChangedAt: now,
      timer: null,
      finalized: false,
    };
    messageStates.set(message, state);
  } else if (state.signature !== signature) {
    state.signature = signature;
    state.lastChangedAt = now;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (!executedMessages.has(message)) {
      state.finalized = false;
    }
  }
  return state;
}

function evaluateMessageFinalization(message, { now = Date.now(), isGenerating = false, stabilityWindowMs = STABILITY_WINDOW_MS } = {}) {
  const state = getOrCreateMessageState(message, now);
  if (state.finalized || executedMessages.has(message)) {
    return { canFinalize: false, state, isStable: true, remainingMs: 0, reason: "already_finalized" };
  }
  if (isGenerating) {
    return { canFinalize: false, state, isStable: false, remainingMs: stabilityWindowMs, reason: "generating" };
  }
  const elapsed = now - state.lastChangedAt;
  if (elapsed < stabilityWindowMs) {
    return { canFinalize: false, state, isStable: false, remainingMs: stabilityWindowMs - elapsed, reason: "within_stability_window" };
  }
  return { canFinalize: true, state, isStable: true, remainingMs: 0, reason: null };
}

function markExistingCallsHandled(customMessages = null, { recoverLatestDoubao = true } = {}) {
  if (customMessages) {
    for (const message of customMessages) {
      executedMessages.add(message);
      const state = getOrCreateMessageState(message);
      state.finalized = true;
      const inspection = inspectThetaMessage(message, { isGenerating: false });
      if (inspection.payload && inspection.payload.message_id) {
        handled.add(inspection.payload.message_id);
      }
    }
    return;
  }
  const assistantMessages = messagesByRole("assistant");
  const recoverableDoubaoMessage = isDoubao && recoverLatestDoubao
    ? [...assistantMessages].reverse().find((message) => hasCodeAiHeader(message))
    : null;
  for (const message of assistantMessages) {
    if (hasBridgeHeader(message)) {
      for (const call of callsFromMessage(message)) handled.add(call.request_id);
      executedMessages.add(message);
    }
    if (hasCodeAiHeader(message)) {
      if (message === recoverableDoubaoMessage) continue;
      const codeaiMsg = parseCodeAiMessage(message);
      if (codeaiMsg && codeaiMsg.message_id) {
        handled.add(codeaiMsg.message_id);
        persistHandledCodeAiId(codeaiMsg.message_id);
      }
      executedMessages.add(message);
    }
    // 关键基线防护：页面加载/刷新时，页面上已有的历史电报消息全部打标已处理，严禁历史重放！
    // 唯有当前处于活跃流式生成中（正在打字）的最后一条消息才被豁免，等待生成结束后出站。
    if (typeof isTelegramOutbound === "function" && isTelegramOutbound(message.textContent)) {
      if (typeof isGenerationActiveNow === "function" && isGenerationActiveNow() && message === assistantMessages[assistantMessages.length - 1]) {
        // 正在流式打字中，不锁死，等待结束
      } else {
        telegramExecutedElements.add(message);
      }
    }
  }
  if (typeof document !== "undefined") {
    const pageNodes = document.querySelectorAll(
      structuralSelectors.legacyMessages
    );
    for (const node of pageNodes) {
      if (node.closest(`#${PANEL_ID}`) || node.closest("textarea, [contenteditable='true']")) continue;
      if (hasCodeAiHeader(node)) {
        executedMessages.add(node);
        const codeaiMsg = parseCodeAiMessage(node);
        if (codeaiMsg && codeaiMsg.message_id) {
          handled.add(codeaiMsg.message_id);
          persistHandledCodeAiId(codeaiMsg.message_id);
        }
      }
    }
  }
  if (isQwen) {
    for (const message of qwenAssistantMessages()) {
      executedMessages.add(message);
      const state = getOrCreateMessageState(message);
      state.finalized = true;
      const inspection = inspectThetaMessage(message, { isGenerating: false });
      if (inspection.payload && inspection.payload.message_id) {
        handled.add(inspection.payload.message_id);
      }
    }
  }
}

// @content-section outbound-notices
const LOCAL_NOTICE_PREFIX = "[#bridge_local_notice]";
const injectedNoticeKeys = new Set();

function persistInjectedNoticeKey(key) {
  if (!key) return;
  injectedNoticeKeys.add(key);
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
      chrome.storage.local.get(["injected_notice_keys"], (res) => {
        const list = Array.isArray(res?.injected_notice_keys) ? res.injected_notice_keys : [];
        if (!list.includes(key)) {
          list.push(key);
          if (list.length > 200) list.splice(0, list.length - 200);
          chrome.storage.local.set({ injected_notice_keys: list });
        }
      });
    }
  } catch {}
}

try {
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get(["injected_notice_keys"], (res) => {
      const list = res?.injected_notice_keys;
      if (Array.isArray(list)) {
        for (const k of list) injectedNoticeKeys.add(k);
      }
    });
  }
} catch {}

function isSelfCorrectableRejection(reason) {
  // 只注入「写信节点自己改得动」的载荷类拒绝。
  // cc is not supported ＝ CTO Gate 20260916 §4 的 FAIL-CLOSED 拒绝，
  // 节点删掉 cc / 改写 recipient 即可通过 ⇒ 属可自纠，必须注入（否则是第二种静默）。
  return /not in allowed (recipients|types)|cc is not supported|sensitive data detected|does not match the authenticated principal|message_id must be a valid UUID|exceeds maximum length|invalid codeai envelope/i
    .test(String(reason || ""));
}

async function injectOutboundFailureNotice(reason, dedupeKey) {
  const key = String(dedupeKey || reason || "").slice(0, 160);
  if (!key || injectedNoticeKeys.has(key)) return false;
  const probe = isQwen ? qwenEditor() : promptEditor();
  if (!probe) return false;
  if (String(probe.value ?? probe.textContent ?? "").trim()) return false;
  if (generationIsVisible() || (isQwen && qwenGenerationIsVisible())) return false;
  injectedNoticeKeys.add(key);
  persistInjectedNoticeKey(key);
  const ref = `bridge-local-notice-${crypto.randomUUID()}`;
  const text = [
    `${LOCAL_NOTICE_PREFIX} 本地系统提示（不是信件；请勿回复、勿引用、勿当协作件处理）：`,
    "你刚才发出的 CodeAi 信件【未落盘】，被本地桥拒绝了。",
    `桥的原始回执：${reason}`,
    "请按回执修正后重发。要点：recipient 必须是白名单节点名（拿不准就只写一个）；type 整行省略即合法（桥端默认 CUSTOM），ping / TEXT 之类自造标签会被 400 拒收；本通道没有 cc/bcc —— 若写了 cc，请删掉整行并把全部收件人写进 recipient 的 _收件人A_收件人B_ 名单。",
    `ref ${ref}`,
  ].join("\n");
  try {
    const filled = isQwen ? insertIntoQwenEditor(text) : insertIntoEditor(text);
    await (isQwen ? submitQwenEditor(filled, ref) : submitEditor(filled, ref));
    setActivity("桥的拒绝原因已注入聊天窗（写信节点可见，可自纠重发）", { warning: true });
    return true;
  } catch (error) {
    setActivity(`注入拒绝原因失败（仅页面浮层可见）：${error.message}`, { warning: true });
    return false;
  }
}

async function scanCodeAiCalls() {
  if (routeBaselinePending || killSwitchActive !== false) return;
  const scanned = new Set();
  const candidates = [];
  const assistantList = messagesByRole("assistant");
  for (const message of assistantList.slice(-3)) {
    candidates.push(message);
    scanned.add(message);
  }
  if (typeof document !== "undefined") {
    const pageNodes = document.querySelectorAll(
      structuralSelectors.legacyMessages
    );
    const recentNodes = Array.from(pageNodes).slice(-5);
    for (const node of recentNodes) {
      if (node.closest(`#${PANEL_ID}`) || node.closest("textarea, [contenteditable='true']")) continue;
      if (!scanned.has(node) && hasCodeAiHeader(node)) {
        candidates.push(node);
        scanned.add(node);
      }
    }
  }

  for (const message of candidates) {
    if (executedMessages.has(message) || !hasCodeAiHeader(message)) continue;
    const codeaiMsg = parseCodeAiMessage(message);
    if (!codeaiMsg || !codeaiMsg.message_id) continue;
    if (handled.has(codeaiMsg.message_id)) continue;
    handled.add(codeaiMsg.message_id);
    persistHandledCodeAiId(codeaiMsg.message_id);
    executedMessages.add(message);

    setActivity(`正在发送 CodeAi 消息到会议: ${codeaiMsg.title || "消息"}...`);
    try {
      const resp = await send({ type: "bridge-codeai-post", payload: { codeai_message: codeaiMsg } });
      if (resp && resp.ok) {
        setActivity(`CodeAi 消息已写入会议: ${resp.filename || "成功"}`);
      } else {
        setActivity(`CodeAi 写入失败: ${resp?.error || "未知错误"}`);
      }
    } catch (e) {
      const reason = String(e.message || e);
      if (reason.includes("404")) {
        setConnectionKey("panelVersionMismatch", "warning");
        setActivity("CodeAi 发信失败 (HTTP 404)：VERSION_MISMATCH / RESTART_REQUIRED");
      } else if (reason.includes("503") || reason.includes("PAUSED")) {
        setActivity("CodeAi 发信失败：控制链已暂停 (PAUSED)");
      } else {
        setActivity(`CodeAi 发信失败：${reason}`, { warning: true });
        // C：把拒绝原因注入本节点聊天窗，让它自己看到并修正重发（不 await，不阻塞轮询）
        if (isSelfCorrectableRejection(reason)) {
          injectOutboundFailureNotice(reason, codeaiMsg.message_id);
        }
      }
    }
  }
}

// @content-section outbound-openclaw
const OPENCLAW_HEADER = "[#openclaw:v1]";
const OPENCLAW_RESULT_HEADER = "[#openclaw_result:v1]";
let isOpenClawBusy = false;
const openclawInFlight = new Set();

function hasOpenClawHeader(message) {
  if (!message) return false;
  const content = (message.textContent || "").trimStart();
  if (!content.includes(OPENCLAW_HEADER)) return false;
  const idx = content.indexOf(OPENCLAW_HEADER);
  const tail = content.slice(idx + OPENCLAW_HEADER.length).trimStart();
  return !tail || tail.startsWith("{") || tail.startsWith("｛") || tail.startsWith("<");
}

function parseOpenClawTask(message) {
  if (!message) return null;
  const extract = (body) => {
    for (const s of extractJsonObjects(body)) {
      try {
        const obj = safeParseJson(s);
        // 信封优先 {"openclaw_task": {...}}；裸格式兜底（同 codeai 裸 JSON 血泪，2026-09-15）。
        if (obj?.openclaw_task?.task_id && obj.openclaw_task.instruction) return obj.openclaw_task;
        if (typeof obj?.task_id === "string" && typeof obj?.instruction === "string") return obj;
      } catch {}
    }
    return null;
  };
  const codeBlocks = message.querySelectorAll ? [...message.querySelectorAll("pre code, pre, code")] : [];
  for (const block of codeBlocks) {
    const blockText = (block.textContent || "").trimStart();
    if (blockText.includes(OPENCLAW_HEADER)) {
      const idx = blockText.indexOf(OPENCLAW_HEADER);
      const task = extract(blockText.slice(idx + OPENCLAW_HEADER.length));
      if (task) return task;
    }
  }
  const content = (message.textContent || "").trimStart();
  const idx = content.indexOf(OPENCLAW_HEADER);
  if (idx >= 0) {
    return extract(content.slice(idx + OPENCLAW_HEADER.length));
  }
  return null;
}

// VOID 任务判定（补偿施工令 20260915144810 §二）：task 体带 "void": true 或
// task_id 以 void- / void_ 前缀 ⇒ 排除、标记已执行、不派发、不回注。
function isOpenClawVoidTask(task) {
  if (!task) return false;
  if (task.void === true) return true;
  return /^void[-_]/i.test(String(task.task_id || ""));
}

async function scanOpenClawTasks() {
  if (isOpenClawBusy || killSwitchActive !== false) return;
  const candidates = messagesByRole("assistant").filter(
    (message) => !executedMessages.has(message) && hasOpenClawHeader(message),
  );
  if (!candidates.length) return;
  isOpenClawBusy = true;
  try {
    for (const message of candidates) {
      const task = parseOpenClawTask(message);
      if (!task || !task.task_id || openclawInFlight.has(task.task_id)) continue;
      if (isOpenClawVoidTask(task)) {
        executedMessages.add(message);
        setActivity(`OpenClaw VOID 任务已排除: ${task.task_id}`, { warning: true });
        continue;
      }
      openclawInFlight.add(task.task_id);
      executedMessages.add(message);
      setActivity(`OpenClaw 任务转发中: ${task.task_id} ...`);
      try {
        // P0 架构纠偏（20260915145619）：插件在 OpenClaw 链路只做出站识别与发送，
        // 不做结果回填。结果由 Relay 写入既有 CodeAI 会议邮件总线，不经浏览器。
        await send({
          type: "bridge-openclaw-task",
          payload: {
            task_id: task.task_id,
            session_key: task.session_key || "agent:bridgewatch:main",
            instruction: task.instruction,
            timeout_ms: task.timeout_ms,
          },
        });
        setActivity(`OpenClaw 任务已出站: ${task.task_id}（结果走会议邮件总线）`);
      } catch (e) {
        // 传输失败：本消息不再重扫（防重复派发循环），task 锁释放；
        // 页面刷新后允许再试（relay 可能已恢复）。
        openclawInFlight.delete(task.task_id);
        executedMessages.add(message);
        setActivity(`OpenClaw 出站失败: ${task.task_id} — ${e.message}`, { warning: true });
      }
    }
  } finally {
    isOpenClawBusy = false;
  }
}

// @content-section outbound-telegram-state
const telegramHandled = new Set();
const telegramInFlight = new Set();
const telegramExecutedElements = new WeakSet();

function persistTelegramHandledHash(hash) {
  if (!hash) return;
  telegramHandled.add(hash);
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
      chrome.storage.local.get(["telegram_handled_hashes"], (res) => {
        const list = Array.isArray(res?.telegram_handled_hashes) ? res.telegram_handled_hashes : [];
        if (!list.includes(hash)) {
          list.push(hash);
          if (list.length > 500) list.splice(0, list.length - 500);
          chrome.storage.local.set({ telegram_handled_hashes: list });
        }
      });
    }
  } catch {}
}

// 页面启动时恢复历史已发送哈希，确保刷新页面时绝不重复发送历史公文
try {
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get(["telegram_handled_hashes"], (res) => {
      const list = res?.telegram_handled_hashes;
      if (Array.isArray(list)) {
        for (const h of list) telegramHandled.add(h);
      }
    });
  }
} catch {}

function isGenerationActiveNow() {
  if (generationIsVisible()) return true;
  if (isQwen && typeof qwenGenerationIsVisible === "function" && qwenGenerationIsVisible()) return true;
  if (isDoubao) {
    // 豆包严格流式中判定：只认明确的 true / 1，绝不可写裸 [data-streaming]（结束时属性为 data-streaming="false"）
    const streamingEl = document.querySelector(structuralSelectors.doubaoStreaming);
    if (streamingEl) return true;
    // 豆包深度思考（Deep Think / CoT）流式状态检测：
    // 若页面存在思考过程模块且尚未标记为“已完成思考”，代表思考中，绝不可触发提前超时！
    const cotBlocks = document.querySelectorAll(
      ".message-node-cot-summary, [data-message-selection-module='thinking_progress'], [data-plugin-identifier*='thinking_block']"
    );
    for (const block of cotBlocks) {
      if (block.getClientRects().length > 0) {
        const text = (block.textContent || "").trim();
        if (!text.includes("已完成思考") || text.includes("思考中")) {
          return true;
        }
      }
    }
  }
  // 全局可见的停止按钮（严格可见性判定，避免被隐藏 DOM 误判）
  const stopCandidates = document.querySelectorAll(structuralSelectors.stopButtons);
  for (const btn of stopCandidates) {
    if (btn.getClientRects().length > 0 && !btn.disabled) {
      return true;
    }
  }
  return false;
}

let terminalWaitStartedAt = null;   // 2026-10-20 M4：从未 terminal 的有界等待计时
let lastOutboundTrace = "";
let lastOutboundTraceAt = 0;
function traceOutbound(reason, characters = 0) {
  const fingerprint = `${reason}:${activeReplyDeliveryId || "none"}`;
  if (fingerprint === lastOutboundTrace && Date.now() - lastOutboundTraceAt < 30000) return;
  lastOutboundTrace = fingerprint;
  lastOutboundTraceAt = Date.now();
  const event = {stage:"page_scan",reason,characters,delivery_id:activeReplyDeliveryId || "",revision:"outbound-diagnostics-20261009"};
  // Retain the last event locally even if the running Worker predates this API.
  try {chrome.storage.local.set({pocketfleet_last_outbound_trace:event}).catch(()=>{});} catch {}
  send({type:"bridge-outbound-trace",event}).catch(()=>{});
}

let lastOutboundFailure = null;
let lastOutboundFailureAt = 0;
let generationFinishedAt = null;

function resetOutboundFailure() {
  lastOutboundFailure = null;
  lastOutboundFailureAt = 0;
  generationFinishedAt = null;
}

function releaseReplyLock(reason = "manual_release") {
  const prevId = activeReplyDeliveryId;
  activeReplyDeliveryId = null;
  activeReplyRoute = null;
  if (replyLockWatchdogTimer) {
    clearTimeout(replyLockWatchdogTimer);
    replyLockWatchdogTimer = null;
  }
  resetOutboundFailure();
  replyLifecycleState = "IDLE_EMPTY";
  observedGenerating = false;
  observedSubmitted = false;
  terminalWaitStartedAt = null;
  lastStableOutboundText = "";
  stableOutboundPollTicks = 0;
  console.log(`[PocketFleet] 🔓 出站回复锁已解除 (原因: ${reason}, delivery: ${prevId})`);
  setActivity(`出站等待已解除 (${reason})，队列已恢复就绪`);
  renderStatus();
}

// @content-section outbound-telegram
async function scanTelegramCalls() {
  if (routeBaselinePending || killSwitchActive !== false) {traceOutbound(routeBaselinePending ? "baseline" : "paused");return;}
  if (!activeReplyDeliveryId) {traceOutbound('uncorrelated_output');return;}

  const assistantList = messagesByRole("assistant");
  if (!assistantList || assistantList.length === 0) {traceOutbound("no_assistant");return;}

  // 铁律 1（防重放）：出站消息在逻辑上只能是整个页面当前最新的一条助手消息！绝不回溯扫描历史旧消息！
  const targetMessage = assistantList[assistantList.length - 1];
  const turnMatched = replyMatchesSubmittedTurn(activeReplyUserMessage,
    activeReplyPreviousAssistants, targetMessage, messagesByRole('user'));

  if (telegramExecutedElements.has(targetMessage)) {traceOutbound("handled_element");return;}
  if (targetMessage.closest && targetMessage.closest(".ds-think-content, [class*='think-content'], [class*='think'], [class*='thought'], [class*='reasoning'], details, summary")) return;
  if (isThinkingElement(targetMessage)) return;

  let text = "";
  if (targetMessage.cloneNode) {
    const replyBody = adapterProfile?.id === "gemini-earth-sandbox"
      ? targetMessage.querySelector(structuralSelectors.geminiReplyBody)
      : (isDoubao ? targetMessage.querySelector("[data-testid='message_text_content'], .flow-markdown-body, .md-box-root")
      : (isQwen ? targetMessage.querySelector(".custom-qwen-markdown, .qwen-markdown, .response-message-content")
      // Grok: targetMessage 可能是 div.prose（直接用）或 div.message-bubble（提取 .prose 子节点）
      : (isGrok ? (targetMessage.matches && targetMessage.matches(".prose") ? targetMessage : targetMessage.querySelector(".prose") || targetMessage)
      : null)));
    const clone = (replyBody || targetMessage).cloneNode(true);
    if (isDoubao) {
      truncateAtMessageActions(clone);
    }
    clone.querySelectorAll(
      structuralSelectors.replyChrome
    ).forEach((el) => el.remove());
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let firstText;
    while ((firstText = walker.nextNode())) {
      if (!firstText.textContent.trim()) continue;
      if (firstText.parentElement?.closest("blockquote")) {traceOutbound("quoted_header");return;}
      break;
    }
    // textContent does not preserve paragraph boundaries in rendered Markdown.
    clone.querySelectorAll("p, li, pre, blockquote, h1, h2, h3, h4, tr, br, [class*='markdown-paragraph'], [class*='markdown-space'], .qwen-markdown-paragraph").forEach((el) => {
      el.appendChild(document.createTextNode("\n"));
    });
    text = (clone.textContent || "").trim();
  } else {
    text = (targetMessage.textContent || "").trim();
  }

  // 判定是否正在流式生成
  const generatingNow = isGenerationActiveNow();
  if (generatingNow) {
    observedGenerating = true;
    replyLifecycleState = "GENERATING";
    generationFinishedAt = null;
    lastStableOutboundText = "";
    stableOutboundPollTicks = 0;
    if (replyLockWatchdogTimer) armReplyLockWatchdog(REPLY_LOCK_WATCHDOG_RENEW_MS);
    traceOutbound("generating", text.length);
    setTimeout(scanTelegramCalls, 1500);
    return;
  }

  // 轮次匹配与用户消息挂载状态
  if (turnMatched) {
    observedSubmitted = true;
  }

  // 泥蛇四重防护之 1 & 2：完结态（TERMINAL）判定与秒回穿透兼容
  const configuredActions = featureSelectors('completedActions');
  // 兼顾各平台结构：
  // - 外层去重容器 (如 div.message-bubble:has(.prose))：内部直接含有操作栏；
  // - 内层正文容器 (如 ChatGPT 的 [data-message-author-role='assistant'] 或 Gemini 的 model-response)：
  //   操作栏位于外层卡片 (article / model-response / agent-turn) 底部；
  // - 兄弟节点 (如 Grok)：位于 targetMessage.nextElementSibling；
  // 全域严守 user 隔离闸，绝不跨层命中 user 消息按钮。
  const userSelectorList = featureSelectors('userMessages');
  const userSelectorText = (userSelectorList && userSelectorList.length) ? userSelectorList.join(", ") : null;
  const findAction = (scope) => {
    if (!scope) return null;
    return (configuredActions && configuredActions.length && queryFirst(configuredActions, scope))
      || (structuralSelectors.completedActionBars && scope.querySelector(structuralSelectors.completedActionBars));
  };
  let actionCandidate = findAction(targetMessage);
  if (!actionCandidate && targetMessage.closest) {
    const turnContainer = targetMessage.closest("article, model-response, [data-test-id='model-response'], [class*='agent-turn'], [data-testid^='conversation-turn-'], [class*='ChatMessage'], .chat-item, [class*='message-bubble']");
    if (turnContainer && turnContainer !== targetMessage) {
      actionCandidate = findAction(turnContainer);
    }
  }
  if (!actionCandidate && targetMessage.nextElementSibling) {
    actionCandidate = findAction(targetMessage.nextElementSibling);
  }
  const hasFinishedAction = Boolean(actionCandidate && actionCandidate.getClientRects().length > 0
    && !(userSelectorText && actionCandidate.closest(userSelectorText)));

  // 泥蛇四重防护之 1 & 2：完结态（TERMINAL）判定
  // 双重防御机制：
  // 1. 首选极速完结：捕获到流式生成中并熄灭（observedGenerating），或提交后检测到完成操作栏（hasFinishedAction）即刻完结出站！
  // 2. 兜底（isTextStable）：针对秒回（轮询错过生成态）或平台操作栏结构微调（如结算主机、地球Sandbox），
  //    当非空文本在连续 2 次轮询（>=3秒）中保持完全一致且未在生成中（!generatingNow），
  //    安全判定为稳定完结，打破 waiting_terminal_state 死锁！
  if (text && text === lastStableOutboundText && !generatingNow) {
    stableOutboundPollTicks++;
  } else {
    lastStableOutboundText = text;
    stableOutboundPollTicks = 0;
  }
  const isTextStable = Boolean(text && stableOutboundPollTicks >= 2 && !generatingNow);

  const isTerminal = observedGenerating || (observedSubmitted && hasFinishedAction) || isTextStable;
  if (!isTerminal) {
    if (!terminalWaitStartedAt) terminalWaitStartedAt = Date.now();
    if (Date.now() - terminalWaitStartedAt > 90000) {
      traceOutbound("seat_anomaly_no_terminal", text.length);
      send({ type: "bridge-outbound-trace", event: { stage: "page_scan", reason: "seat_anomaly_no_terminal", delivery_id: activeReplyDeliveryId || "", details: "no_terminal_90s" } }).catch(() => {});
      setActivity("🚨 席位无完结态告警：90s 既未检测到生成中、也未检测到完成操作栏，已释放锁防会议阻塞；请检查该平台页面结构或规则版本", { warning: true });
      releaseReplyLock("no_terminal_timeout");
      return;   // 顺序铁律：先可见告警，再解锁；不得静默释放
    }
    traceOutbound("waiting_terminal_state", text.length);
    setTimeout(scanTelegramCalls, 1500);
    return;
  }
  terminalWaitStartedAt = null;   // terminal 达成即清零（放在 if 块之后、原代码继续处）
  lastStableOutboundText = "";
  stableOutboundPollTicks = 0;

  // 泥蛇四重防护之 3：平台异常/额度耗尽熔断拦截
  const rawTargetText = (targetMessage.textContent || "").trim();
  const configuredErrors = featureSelectors('errorIndicators');
  const errorEl = (configuredErrors && configuredErrors.length && queryFirst(configuredErrors))
    || (structuralSelectors.errorIndicators && document.querySelector(structuralSelectors.errorIndicators));
  const hasQuotaError = /免费额度用完了|开通豆包订阅|额度已用尽|usage limit|free messages|quota limit|Too many requests/i.test(rawTargetText);
  if (errorEl || hasQuotaError) {
    console.error("[PocketFleet] 🛑 平台异常/额度耗尽熔断拦截！", rawTargetText.slice(0, 100));
    traceOutbound("platform_fault_abort");
    setActivity("⚠ 平台额度耗尽或发生异常，生成已被平台中断", { warning: true });
    releaseReplyLock("platform_fault_abort");
    return;
  }

  // 泥蛇四重防护之 4：人工取消/已停止辨识
  const configuredCancels = featureSelectors('cancelIndicators');
  const cancelEl = (configuredCancels && configuredCancels.length && queryFirst(configuredCancels))
    || (structuralSelectors.cancelIndicators && document.querySelector(structuralSelectors.cancelIndicators));
  if (cancelEl || /已停止生成|You stopped the response/i.test(rawTargetText)) {
    console.warn("[PocketFleet] ⚠️ 检测到用户或平台取消生成，停止投递");
    traceOutbound("canceled_output");
    releaseReplyLock("canceled_output");
    return;
  }

  if (!text) {
    // 助手文本尚未输出或处于思考空窗期，绝不可提前标记生成结束！
    generationFinishedAt = null;
    traceOutbound("waiting_reply_text", 0);
    setTimeout(scanTelegramCalls, 1500);
    return;
  }
  if (!generationFinishedAt) {
    generationFinishedAt = Date.now();
  }

  // 运行信封解析流水线：宽容解析 → 规范化 → 严格语义校验 (Clause 1)
  if (!turnMatched) {
    traceOutbound("waiting_turn_match", text.length);
    // 轮次匹配中（助手消息未挂载或正在流式准备）：保持平稳等待，不报虚假解析失败
    setTimeout(scanTelegramCalls, 1500);
    return;
  }

  const envelope = parseAndValidateEnvelope(text);
  if (!envelope.ok) {
    const reason = envelope.error;
    lastOutboundFailure = {
      at: Date.now(),
      reason,
      rawSnippet: text.slice(0, 200),
      deliveryId: activeReplyDeliveryId
    };
    lastOutboundFailureAt = Date.now();
    traceOutbound(reason, text.length);

    // 观察性告警：在面板上展示明确失败状态 (Clause 2)
    setActivity(`⚠ 出站解析失败：[${reason}]，已拦截防错投；可在面板重试或释放`, { warning: true });

    // 防永久卡死超时机制 (Clause 2)：生成已停止且持续未通过协议校验超过 25 秒，自动释放锁以防整场会议永久瘫痪
    if (Date.now() - generationFinishedAt > 25000) {
      console.warn("[PocketFleet] ⚠ 生成结束超过 25 秒仍未通过出站校验，自动释放 activeReplyDeliveryId，避免会议永久卡死", activeReplyDeliveryId, reason);
      traceOutbound("seat_anomaly_timeout", text.length);
      send({ type: "bridge-outbound-trace", event: { stage: "page_scan", reason: "seat_anomaly_timeout", delivery_id: activeReplyDeliveryId || "", details: `timeout_after_${reason}` } }).catch(() => {});
      setActivity(`🚨 席位响应异常：生成结束超 25s 仍未见合法协议出站 (${reason})，疑似未带信封或额度耗尽，已释放锁防会议阻塞`, { warning: true });
      releaseReplyLock(`timeout_after_${reason}`);
    } else {
      setTimeout(scanTelegramCalls, 2000);
    }
    return;
  }

  // 校验成功，清空失败记录
  resetOutboundFailure();

  // 稳定性追踪：以 cleanText 签名判断 1000ms 内是否无新内容追加
  const cleanText = envelope.normalizedText;
  if (!cleanText) return;

  const state = getOrCreateMessageState(targetMessage, Date.now());
  if (Date.now() - state.lastChangedAt < 1000) {
    traceOutbound("unstable", text.length);
    setTimeout(scanTelegramCalls, 1000);
    return;
  }

  // 铁律 3：计算 SHA-256 并严格比对持久化已发哈希池 (at-most-once)
  const isCompatibleRoute = (r1, r2) => {
    if (!r1 || !r2) return false;
    if (r1 === r2) return true;
    return typeof isSameOriginConversationPromotion === "function" && isSameOriginConversationPromotion(r1, r2);
  };
  const replyDeliveryId = isCompatibleRoute(activeReplyRoute, pageRouteKey()) ? activeReplyDeliveryId : null;
  const replyRoute = pageRouteKey();
  const deliveryScope = replyDeliveryId || `local-${state.outboundScope ||= Date.now() + "-" + Math.random()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
    `${pageRouteKey()}\n${deliveryScope}\n${cleanText}`
  ));
  const key = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (pageRouteKey() !== replyRoute || (replyDeliveryId && activeReplyDeliveryId !== replyDeliveryId)) return;

  // 只要内存已标记、或持久化已发池已记录、或正在飞行中，绝对物理锁死，严禁重复出站！
  if (telegramExecutedElements.has(targetMessage) || telegramHandled.has(key) || telegramInFlight.has(key)) {
    traceOutbound("duplicate", cleanText.length);
    telegramExecutedElements.add(targetMessage);
    return;
  }

  // 锁定该 DOM 元素与内容哈希
  telegramExecutedElements.add(targetMessage);
  telegramInFlight.add(key);
  // Reserve before sending. An uncertain HTTP outcome must never replay a reply.
  persistTelegramHandledHash(key);

  const sender = adapterProfile?.id === "chatgpt-folded-host" ? "chatgpt" :
                 adapterProfile?.id === "claude-web" ? "claude" :
                 adapterProfile?.id === "gemini-earth-sandbox" ? "gemini" :
                 adapterProfile?.id === "deepseek-remainder" ? "deepseek" :
                 adapterProfile?.id === "copilot-grayfold" ? "copilot" :
                 adapterProfile?.id === "doubao-heart" ? "doubao" :
                 adapterProfile?.id === "qwen-theta" ? "qwen" :
                 adapterProfile?.id === "glm-xingtu" ? "glm" :
                 adapterProfile?.id === "kimi-motin" ? "kimi" :
                 adapterProfile?.id === "grok-web" ? "grok" : "chatgpt";

  try {
    traceOutbound("send_started", cleanText.length);
    const resp = await send({
      type: "bridge-telegram-post",
      payload: { text: cleanText, sender: sender, source_key: replyRoute, delivery_id: replyDeliveryId, outbound_key: key },
    });
    if (!resp?.ok) throw new Error(resp?.error || "Bridge 未确认投递");
    if (activeReplyDeliveryId === replyDeliveryId) {
      activeReplyDeliveryId = null;
      activeReplyRoute = null;
      resetOutboundFailure();
    }
    traceOutbound("send_ok", cleanText.length);
    persistTelegramHandledHash(key);
    setActivity(`[电报] 出站已成功排入待发队列（完整报文，单次投递）！`);
  } catch (error) {
    traceOutbound("send_failed", cleanText.length);
    const errMsg = String(error.message || error);
    if (errMsg.includes("lease mismatch") || errMsg.includes("already consumed") || errMsg.includes("identity mismatch") || errMsg.includes("uncorrelated output") || errMsg.includes("already reserved") || errMsg.includes("invalid JSON response")) {
      // 终态错误/已失效历史/示例复述：自动解除回复锁并标记为已处理，防止页面被永久死锁
      if (activeReplyDeliveryId === replyDeliveryId) {
        activeReplyDeliveryId = null;
        activeReplyRoute = null;
        resetOutboundFailure();
      }
      persistTelegramHandledHash(key);
    }
    // An uncertain outcome keeps the reservation: never replay automatically.
    setActivity(`[电报] 投递失败或结果未知（不自动重发）：${error.message || error}`, { warning: true });
  } finally {
    telegramInFlight.delete(key);
  }
}

