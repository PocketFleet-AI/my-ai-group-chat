// @content-section delivery-instructions
async function injectCollaborationProtocol() {
  if (killSwitchActive) throw new Error("执行总开关已暂停。");
  if (generationIsVisible() || (isQwen && qwenGenerationIsVisible())) {
    throw new Error("当前 AI 正在生成回复，请等待结束后重试。");
  }
  const requestId = `codeai-bootstrap-${crypto.randomUUID()}`;
  const whitelist = await fetchCodeAiWhitelist();
  const prompt = collaborationProtocolBootstrap(requestId, whitelist);
  const editorElem = isQwen ? qwenPromptEditor() : promptEditor();
  const currentDraft = editorElem ? editorText(editorElem) : "";
  let finalPrompt = prompt;
  if (currentDraft && currentDraft.trim() && !isManagedCodeAiDraft(currentDraft)) {
    const divider = `\n\n${panelT("panelMeetingDivider")}\n\n`;
    finalPrompt = `${currentDraft.trim()}${divider}${prompt}`;
  }
  const hasAppendedDraft = finalPrompt !== prompt;
  if (isQwen) {
    const editor = insertIntoQwenEditor(finalPrompt);
    await submitQwenEditor(editor, requestId);
  } else {
    const editor = insertIntoEditor(finalPrompt, hasAppendedDraft);
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
    setActivity(panelT("panelReinjecting"));
    await injectCollaborationProtocol();
    setActivity(panelT("panelReinjected"));
  } catch (error) {
    setActivity(`NEEDS_HUMAN：${error.message}`);
  } finally {
    if (button) {
      button.dataset.busy = "";
      button.disabled = false;
    }
  }
}

// @content-section delivery-codeai-state
let isPullingCodeAi = false;

// @content-section delivery-codeai
const CODEAI_MEETING_NOTICE_HEADER = "[#codeai_meeting_notice:v1]";

function isManagedCodeAiDraft(text) {
  return text.trimStart().startsWith(CODEAI_MEETING_NOTICE_HEADER)
    && text.includes("来源文件:");
}

function managedDraftMatchesDelivery(text, prompt) {
  return isManagedCodeAiDraft(text)
    && text.trim() === prompt.trim();
}

let activeReplyDeliveryId = null;
let activeReplyRoute = null;
let activeReplyUserMessage = null;
let activeReplyPreviousAssistants = new Set();
// 泥蛇五状态时序机跟踪变量 (IDLE_EMPTY, DRAFT_READY, SUBMITTED, GENERATING, TERMINAL)
let replyLifecycleState = "IDLE_EMPTY";
let observedGenerating = false;
let observedSubmitted = false;
let lastStableOutboundText = "";
let stableOutboundPollTicks = 0;
function traceSubmissionFailure(error, deliveryId) {
  const message = String(error?.message || error);
  const reason = message.includes("SUBMISSION_CANCELED") ? "submission_canceled"
    : message.includes("SUBMIT_UNCONFIRMED") ? "submit_unconfirmed"
      : message.includes("WAKE_UNCONFIRMED") ? "wake_unconfirmed"
        : message.includes("CALLBACK_UNCONFIRMED") ? "callback_unconfirmed"
          : message.includes("发送按钮") ? "submit_button_unavailable" : "submission_exception";
  send({
    type: "bridge-outbound-trace", event: {
      stage: "page_post", reason, delivery_id: deliveryId || "",
    }
  }).catch(() => { });
}
globalThis.__pfStudioTaskIdle = () => !activeReplyDeliveryId && !pendingDelivery && !isPullingCodeAi && !isPullingTheta
  && !routeBaselinePending;
globalThis.__pfRulesIdle = () => globalThis.__pfStudioTaskIdle() && !generationIsVisible()
  && !(isQwen && qwenGenerationIsVisible()) && !(isDoubao && doubaoConversationBusyReason())
  && !globalThis.PocketFleetStudioReserved;
globalThis.__pfStudioCanStart = () => killSwitchActive === false;

// 2026-10-16 回复锁看门狗（游隼）：uncertain 保锁后，若 AI 始终不回复（或回复未被
// 关联），席位会因 ready 门（!activeReplyDeliveryId）永久拒收新投递——旧代码靠
// bridge-reset-reply-lock 远程重置兜底，但 Go 侧零发送方，该通道实际不存在。
// 240s 覆盖 submit(15s)+wake(30s) 双超时并留足回复时间；生成中续期而非解锁
// （提前解锁会让在途回复沦为 uncorrelated）。
const REPLY_LOCK_WATCHDOG_MS = 240000;
const REPLY_LOCK_WATCHDOG_RENEW_MS = 120000;
let replyLockWatchdogTimer = null;
function armReplyLockWatchdog(delayMs) {
  if (replyLockWatchdogTimer) clearTimeout(replyLockWatchdogTimer);
  replyLockWatchdogTimer = setTimeout(() => {
    replyLockWatchdogTimer = null;
    if (!activeReplyDeliveryId) return;
    if (generationIsVisible() || (isQwen && qwenGenerationIsVisible())) {
      armReplyLockWatchdog(REPLY_LOCK_WATCHDOG_RENEW_MS);
      return;
    }
    console.warn('[PocketFleet] ⚠️ 回复锁看门狗超时解锁（AI 长时间未回复或回复未被关联），席位恢复就绪');
    releaseReplyLock("watchdog_timeout");
  }, delayMs);
}
function beginReplyTracking(deliveryId) {
  activeReplyDeliveryId = deliveryId || null;
  activeReplyRoute = pageRouteKey();
  activeReplyUserMessage = null;
  activeReplyPreviousAssistants = new Set(messagesByRole('assistant'));
  replyLifecycleState = activeReplyDeliveryId ? "DRAFT_READY" : "IDLE_EMPTY";
  observedGenerating = false;
  observedSubmitted = false;
  terminalWaitStartedAt = null;
  lastStableOutboundText = "";
  stableOutboundPollTicks = 0;
  if (replyLockWatchdogTimer) {
    clearTimeout(replyLockWatchdogTimer);
    replyLockWatchdogTimer = null;
  }
  if (activeReplyDeliveryId) armReplyLockWatchdog(REPLY_LOCK_WATCHDOG_MS);
}

function replyMatchesSubmittedTurn(userMessage, previousAssistants, targetMessage, userMessages) {
  if (previousAssistants && previousAssistants.has(targetMessage)) return false;
  if (!userMessages || userMessages.length === 0) return false;
  const lastUser = userMessages[userMessages.length - 1];
  if (userMessage && userMessage === lastUser) {
    if (typeof userMessage.compareDocumentPosition !== "function") return false;
    const position = userMessage.compareDocumentPosition(targetMessage);
    return !(position & 1) && Boolean(position & 4);
  }
  // 容忍 React 重绘导致 DOM 引用变化：若最后一条用户消息内容与提交内容吻合，仍视为合法当前轮次
  if (lastUser && userMessage && userMessage.textContent && submittedTurnMatches(lastUser, userMessage.textContent)) {
    if (typeof lastUser.compareDocumentPosition !== "function") return false;
    const position = lastUser.compareDocumentPosition(targetMessage);
    return !(position & 1) && Boolean(position & 4);
  }
  // 兜底：若 userMessage 丢失或由于折叠未命中，但 targetMessage 位于最新用户提问之后，且处于当前投递轮次
  if (!userMessage && lastUser && targetMessage) {
    if (typeof lastUser.compareDocumentPosition !== "function") return false;
    const position = lastUser.compareDocumentPosition(targetMessage);
    return !(position & 1) && Boolean(position & 4);
  }
  return false;
}

function tryUnfoldUserMessage(message) {
  if (!message || typeof message.querySelector !== "function") return;
  // 1. 若配置了折叠状态识别选择器，先快速探测
  const foldedSelectors = featureSelectors('userMessageFolded');
  const isFolded = foldedSelectors && foldedSelectors.length
    ? Boolean(queryFirst(foldedSelectors, message) || (typeof message.matches === 'function' && foldedSelectors.some(s => { try { return message.matches(s); } catch { return false; } })))
    : true;
  if (!isFolded) return;

  // 2. 尝试从 Rules 中获取展开按钮并自动点击
  const expandSelectors = featureSelectors('expandButtons');
  if (expandSelectors && expandSelectors.length) {
    const btn = queryFirst(expandSelectors, message);
    if (btn && typeof btn.click === "function") {
      try {
        btn.click();
      } catch { }
    }
  }
}

function getUserMessageFullText(message) {
  if (!message) return "";
  if (typeof message.querySelector === "function") {
    // 优先尝试从 Rules 指定的完整未折叠子容器中提取
    const fullTextSelectors = featureSelectors('userMessageFullText');
    if (fullTextSelectors && fullTextSelectors.length) {
      const fullNode = queryFirst(fullTextSelectors, message);
      if (fullNode && fullNode.textContent) {
        return fullNode.textContent;
      }
    }
  }
  return message.textContent || "";
}

function submittedTurnMatches(message, submittedText) {
  if (!message || !submittedText) return false;
  // 通过 Rules 驱动的折叠规则自动触发展开
  tryUnfoldUserMessage(message);

  const normalize = (text) => String(text || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  const expected = normalize(submittedText);
  const msgText = normalize(getUserMessageFullText(message));
  if (!expected || !msgText) return false;
  if (msgText.includes(expected)) return true;

  // 容忍超长/折叠提示词（>= 50 字符）在前端大模型 UI 中自动折叠裁剪
  if (expected.length >= 50) {
    if (msgText.length >= 50 && expected.startsWith(msgText.slice(0, 40))) {
      return true;
    }
    // 带有省略号/截断标记的折叠气泡（如截图中的 "...向本场所知流程..."）
    const hasEllipsis = /[.]{2,}|[\u2026]/.test(msgText);
    const cleanMsg = msgText.replace(/^[.\s…\u2026\-_]+/, '').replace(/[.\s…\u2026\-_]+$/, '').trim();
    if (hasEllipsis && cleanMsg.length >= 15 && expected.includes(cleanMsg.slice(0, Math.min(cleanMsg.length, 30)))) {
      return true;
    }
  }
  return false;
}

function isDraftContentEquivalent(current, expected) {
  if (!current || !expected) return false;
  if (current === expected) return true;
  const normCurrent = current.replace(/\s+/g, ' ').trim();
  const normExpected = expected.replace(/\s+/g, ' ').trim();
  if (normCurrent === normExpected) return true;
  if (normCurrent.length >= 10 && (normCurrent.includes(normExpected.slice(0, 30)) || normExpected.includes(normCurrent.slice(0, 30)))) return true;
  return false;
}

function assertSubmissionCurrent(editor, route, draft) {
  // 2026-10-16 守卫除栓（指挥官终裁）：彻底废除过度防御的自杀式假阳性守卫
  // （草稿等价判定、DOM瞬断、路由微动、实例伪替代）。仅保留人类明确开启的紧急暂停键。
  // 坚决贯彻《软件场景优先协议》——业务主线是“把消息发出去”，绝不因防御极端虚假并发而自我阻塞！
  if (killSwitchActive === true) {
    throw new Error('SUBMISSION_CANCELED: pause active; no retry');
  }
}
async function processCodeAiDelivery(resp) {
  if (!resp || !resp.ok || !resp.pending || !resp.content) return false;
  if (doubaoConversationBusyReason()) return false;
  const editor = promptEditor();
  if (!editor) {
    if (activityIsIdle || activityWarning) {
      setActivity(panelT("panelNoEditor"), true);
    }
    return false;
  }
  const existingDraft = editorText(editor);
  const isManagedMeetingDraft = isManagedCodeAiDraft(existingDraft) || (existingDraft && existingDraft.includes("PocketFleet") && existingDraft.includes("任务书"));

  // 客户端绝对去重硬熔断器（防机关枪）：若同一个 delivery_id 在本会话已经提交过，严禁二次注入，直接静默 ACK
  if (resp.delivery_id && localExecutedDeliveryIds.has(resp.delivery_id)) {
    console.warn(`[PocketFleet Bridge] 触发本地去重熔断：delivery_id ${resp.delivery_id} 已执行过，直接静默 ACK 拦截。`);
    await send({ type: "bridge-codeai-ack", delivery_id: resp.delivery_id });
    setActivity(`[熔断防重] 已拦截重复投递: ${resp.delivery_id}`);
    return true;
  }
  if (resp.delivery_id) {
    localExecutedDeliveryIds.add(resp.delivery_id);
  }

  // 对话组免疫硬门禁：若内容包含免回/抄送声明，绝不注入输入框与自动敲回车，直接静默 ACK
  // 注意：必须精准匹配免回标记或信封首行，严禁全文模糊检索 "[NoReply]" 误杀包含说明范例的主持人任务书！
  const trimmedContent = String(resp.content || "").trim();
  const firstLine = trimmedContent.split("\n")[0] || "";
  const isEnvelopeNoReply = /^\[Telegram\]/i.test(firstLine) && /\[NoReply\]/i.test(firstLine);
  const isNoticeOnly = trimmedContent.includes("kind:[notice|")
    || trimmedContent.includes("【此条无需回复，请阅知】")
    || trimmedContent.includes("Mode:[NoReply]")
    || isEnvelopeNoReply;
  if (isNoticeOnly) {
    if (resp.delivery_id) {
      await send({ type: "bridge-codeai-ack", delivery_id: resp.delivery_id });
    }
    setActivity(`[免回件] 已阅知入账: ${resp.filename || "通知公文"}`);
    return true;
  }
  let submissionConfirmed = false;
  try {
    beginReplyTracking(resp.delivery_id);

    // duty-wake（OpenClaw 门铃勤务位）或直通模式
    const isTelegramCollab = String(resp.filename || "").includes("Telegram");
    const isRawDirect = resp.channel === "duty-wake"
      || resp.raw === true
      || String(resp.filename || "").endsWith(".ready.json")
      || isTelegramCollab;
    const prompt = isRawDirect ? resp.content : [
      CODEAI_MEETING_NOTICE_HEADER,
      `来源文件: ${resp.filename}`,
      `----------------------------------------`,
      resp.content,
      `----------------------------------------`,
      `请阅读上述来自会议的最新协作文件并自主处理。`
    ].join("\n");
    let ed = editor;
    if (existingDraft) {
      const currentDraft = editorText(editor);
      const isTelegramText = (text) => {
        if (!text || typeof text !== "string") return false;
        const trimmed = text.trim();
        return trimmed.startsWith("[PFBus]") || trimmed.includes("This message arrived through [PFBus]");
      };
      const isExistingTelegramDraft = isTelegramText(currentDraft);
      const isCurrentTelegramDelivery = isTelegramText(prompt) || isTelegramText(resp.content);

      if (managedDraftMatchesDelivery(currentDraft, prompt)) {
        setActivity(`正在恢复未闭环会议草稿: ${resp.filename}`);
        ed = editor;
      } else if (isManagedMeetingDraft) {
        setActivity(`正在更新为最新会议任务书: ${resp.filename || "Telegram"}`);
        ed = insertIntoEditor(prompt, true);
      } else if (isExistingTelegramDraft || isCurrentTelegramDelivery) {
        // 普通消息绝不使用 Meeting Launch Divider！保留原有消息边界，更新为独立消息，绝不静默拼接
        if (currentDraft.trim() === prompt.trim()) {
          setActivity(`正在恢复待发送 Telegram 消息: ${resp.filename || "Telegram"}`);
          ed = editor;
        } else {
          setActivity(`正在更新为独立 Telegram 消息: ${resp.filename || "Telegram"}`);
          ed = insertIntoEditor(prompt, true);
        }
      } else {
        // 会议专属准则：面对人类用户自有手打草稿，以会议启动分割线追加并提交，保障流程顺畅
        const divider = `\n\n${panelT("panelMeetingDivider")}\n\n`;
        const combined = `${currentDraft.trim()}${divider}${prompt}`;
        setActivity(`${panelT("panelDraftAppended")}${resp.filename || "Telegram"}`);
        ed = insertIntoEditor(combined, true);
      }
    } else {
      ed = insertIntoEditor(prompt);
    }
    const onUserMessageSubmitted = async (_mode, submittedMessage) => {
      submissionConfirmed = true;
      activeReplyUserMessage = submittedMessage || null;
      if (resp.delivery_id) {
        send({ type: "bridge-codeai-ack", delivery_id: resp.delivery_id }).catch(() => { });
      }
      return true;
    };

    const submitToken = String(resp.content).trim().slice(0, 30);
    await submitEditor(ed, submitToken, onUserMessageSubmitted);
    setActivity(`会议来信已投递折叠主机并唤醒: ${resp.filename}`);
    return true;
  } catch (wakeErr) {
    traceSubmissionFailure(wakeErr, resp.delivery_id);
    const errText = String(wakeErr?.message || wakeErr);
    // 2026-10-16：区分「明确失败」（点击前：未就绪/取消/刷新后消失）与「不确定失败」
    // （点击后：激活抛错/未确认/无响应）。仅明确失败释放去重记账恢复服务端重投；
    // uncertain 一律保留记账——Release scheduling, not deduplication。
    const uncertain = errText.includes("SUBMISSION_UNCERTAIN");
    if (wakeErr.message && wakeErr.message.includes("CALLBACK_UNCONFIRMED")) {
      setActivity(`NEEDS_HUMAN：消息已提交，但 ACK 未闭环: ${resp.filename}`);
    } else {
      // Release scheduling, not deduplication: an uncertain send must never replay.
      // 2026-10-16 保锁修正（游隼）：点击后 uncertain（激活抛错/SUBMIT_UNCONFIRMED/
      // WAKE_UNCONFIRMED）时**保留回复锁**——消息可能已实际发出，AI 的回复需要锁才能
      // 被出站扫描器关联。test-6 实证：心机姝 submit_unconfirmed（用户消息检测假阴性，
      // 消息实际已发、AI 已回复）后锁被无条件释放 ⇒ 回复落为 uncorrelated_output
      // ⇒ 永不到解析器、永不入 TG。theta 路径早有此守卫，codeai 路径此前缺失。
      // 仅「明确失败」（点击前：未就绪/取消/刷新后消失）释放锁；uncertain 由回复
      // 成功路径解锁，或看门狗兜底（见 beginReplyTracking）。
      if (!uncertain && !submissionConfirmed && activeReplyDeliveryId === resp.delivery_id) {
        releaseReplyLock("submission_failed");
      }
      if (!uncertain && !submissionConfirmed && resp.delivery_id) {
        localExecutedDeliveryIds.delete(resp.delivery_id);
      }
      throw wakeErr;
    }
  }
  return false;
}

async function pollCodeAiIncoming() {
  if (isQwen || isPullingCodeAi || killSwitchActive || routeBaselinePending || generationIsVisible()) return;
  if (doubaoConversationBusyReason()) return;
  const editor = promptEditor();
  if (!editor) return;

  isPullingCodeAi = true;
  try {
    const resp = await send({ type: "bridge-codeai-pull" });
    if (resp && resp.ok && resp.pending && resp.content) {
      await processCodeAiDelivery(resp);
    }
  } catch (e) {
    console.error("[PocketFleet Bridge] CodeAI 处理异常:", e);
    if (e.message && e.message.includes("404")) {
      setConnectionKey("panelVersionMismatch", "warning");
      setActivity("CodeAi 轮询失败 (HTTP 404)：VERSION_MISMATCH / RESTART_REQUIRED");
    } else {
      setActivity(`投递处理异常: ${e.message}`);
    }
  } finally {
    isPullingCodeAi = false;
  }
}

// @content-section delivery-theta
const inFlightRequests = new Set();

async function scanThetaCalls({ now = Date.now(), sendFn = send, messages = null, isGenerating = null } = {}) {
  if (!isQwen && !messages) return;
  if (isScanningTheta) return;
  isScanningTheta = true;

  try {
    const isGen = isGenerating !== null ? isGenerating : (typeof qwenGenerationIsVisible === "function" ? qwenGenerationIsVisible() : false);
    let activeMacroObserved = false;
    const targetMessages = messages || (typeof qwenAssistantMessages === "function" ? qwenAssistantMessages() : []);

    for (const message of targetMessages) {
      if (executedMessages.has(message)) continue;

      const evalResult = evaluateMessageFinalization(message, { now, isGenerating: isGen });
      const state = evalResult.state;

      if (!evalResult.canFinalize) {
        if (!isGen && evalResult.remainingMs > 0 && !state.timer) {
          state.timer = setTimeout(() => {
            state.timer = null;
            scanThetaCalls({ sendFn, messages, isGenerating });
          }, evalResult.remainingMs + 10);
        }
        if (message.textContent && message.textContent.includes(THETA_HEADER)) {
          activeMacroObserved = true;
          setActivity("正在接收 Theta 流式消息...");
        }
        continue;
      }

      const inspection = inspectThetaMessage(message, { isGenerating: false });
      if (!inspection.hasHeader && !inspection.rejectionReason) {
        // Message has no macro header yet (e.g. thinking area only); do NOT mark finalized
        continue;
      }

      activeMacroObserved = true;

      if (inspection.isIncomplete) {
        setActivity("正在接收 Theta 流式消息...");
        continue;
      }

      if (inspection.rejectionReason) {
        state.finalized = true;
        executedMessages.add(message);
        setActivity(`检测到宏但拒绝：${inspection.rejectionReason}（本条消息不会投递；修正格式后请让 AI 重新输出完整宏）`, { warning: true });
        continue;
      }

      const thetaMsg = inspection.payload;
      if (!thetaMsg || !thetaMsg.message_id) {
        state.finalized = true;
        executedMessages.add(message);
        setActivity("检测到宏但拒绝：缺少有效 message_id（本条消息不会投递）", { warning: true });
        continue;
      }

      if (handled.has(thetaMsg.message_id)) {
        state.finalized = true;
        executedMessages.add(message);
        setActivity(`检测到宏但拒绝：历史请求 (${thetaMsg.message_id})，未重复投递`, { warning: true });
        continue;
      }

      // In-flight guard: prevent duplicate concurrent posts for the same request
      if (inFlightRequests.has(thetaMsg.message_id)) {
        continue;
      }
      inFlightRequests.add(thetaMsg.message_id);
      handled.add(thetaMsg.message_id);
      state.finalized = true;
      executedMessages.add(message);

      setActivity("Theta 请求已提交 Runtime...");
      try {
        const resp = await sendFn({ type: "bridge-theta-post", payload: { theta_codeai_message: thetaMsg } });
        if (resp && resp.ok) {
          if (resp.status === "ALREADY_PROCESSED") {
            setActivity(`Theta 历史消息已幂等处理，未重复注入回执: ${thetaMsg.message_id}`);
            continue;
          }
          // 投递结果只进页面浮层（给人看），不再向聊天窗注入回执宏：
          // 回执会诱发 AI 寒暄轮（实测 Theta「回执已阅」白烧一轮），幂等由桥侧
          // ALREADY_PROCESSED + 信件 message_id 保证，不依赖回执。
          setActivity(
            `Theta 信件已落盘: ${resp.filename || "成功"}（收件方经投递链拉取，AI 无需等待确认、勿自行重发）`
          );
        } else {
          setActivity(`Theta 写入失败: ${resp?.error || "未知错误"}（信件未落盘，请重试）`, { warning: true });
        }
      } catch (e) {
        const reason = String(e.message || e);
        if (reason.includes("404")) {
          setConnectionKey("panelVersionMismatch", "warning");
          setActivity("Theta 发信失败 (HTTP 404)：VERSION_MISMATCH / RESTART_REQUIRED");
        } else if (reason.includes("503") || reason.includes("PAUSED")) {
          setActivity("Theta 发信失败：控制链已暂停 (PAUSED)");
        } else {
          setActivity(`Theta 发信失败：${reason}`, { warning: true });
          // C：同上，让 Qwen 侧节点自己看到拒绝原因（不 await）
          if (isSelfCorrectableRejection(reason)) {
            injectOutboundFailureNotice(reason, thetaMsg.message_id);
          }
        }
      } finally {
        inFlightRequests.delete(thetaMsg.message_id);
      }
    }

    if (!activeMacroObserved && activityIsIdle) {
      setActivity(panelT("panelAdapterInjectedQwen"));
    }
  } finally {
    isScanningTheta = false;
  }
}

async function processThetaDelivery(resp) {
  if (!resp || !resp.ok || !resp.pending || !resp.content) return false;
  const editor = qwenEditor();
  if (!editor || (editor.value || "").trim().length > 0) return false;

  if (resp.delivery_id && localExecutedDeliveryIds.has(resp.delivery_id)) {
    console.warn(`[PocketFleet Bridge] 触发本地去重熔断 (Theta)：delivery_id ${resp.delivery_id} 已执行过，直接静默 ACK 拦截。`);
    await send({ type: "bridge-theta-ack", delivery_id: resp.delivery_id });
    setActivity(`[熔断防重] 已拦截重复投递: ${resp.delivery_id}`);
    return true;
  }

  // 2026-10-16 平权修正（游隼，指挥官令）：QWen 与其他席位**同内容直投**——不再强制包
  // [#theta_meeting_notice:v1] 信封（通用商品设计：网页端对话 AI 同等权限、同等待遇；
  // test-6 实证 QWen 带信封回复、其他席裸文回复，信封策略分裂即双管线分叉成本）。
  // 保留 textarea 专属 DOM 适配（qwenEditor/insertIntoQwenEditor/submitQwenEditor）——
  // inputKind 结构异构是硬因，信封不是。出向 scanThetaCalls 暂留（宏格式不匹配，实际休眠）。
  // 免回门与 codeai 路径对齐：裸内容直投后 [noreply] 件必须静默 ACK，绝不注入诱发回声。
  const trimmedContent = String(resp.content || "").trim();
  const firstLine = trimmedContent.split("\n")[0] || "";
  const isEnvelopeNoReply = /^\[Telegram\]/i.test(firstLine) && /\[NoReply\]/i.test(firstLine);
  const isNoticeOnly = trimmedContent.includes("kind:[notice|")
    || trimmedContent.includes("【此条无需回复，请阅知】")
    || trimmedContent.includes("Mode:[NoReply]")
    || isEnvelopeNoReply;
  if (isNoticeOnly) {
    if (resp.delivery_id) {
      await send({ type: "bridge-theta-ack", delivery_id: resp.delivery_id });
    }
    return true;
  }

  let submissionConfirmed = false;
  try {
    if (resp.delivery_id) {
      localExecutedDeliveryIds.add(resp.delivery_id);
      beginReplyTracking(resp.delivery_id);
    }

    const ed = insertIntoQwenEditor(resp.content);
    const onUserMessageSubmitted = async (_mode, submittedMessage) => {
      submissionConfirmed = true;
      activeReplyUserMessage = submittedMessage || null;
      if (resp.delivery_id) {
        send({ type: "bridge-theta-ack", delivery_id: resp.delivery_id }).catch(() => { });
      }
      return true;
    };

    await submitQwenEditor(ed, resp.delivery_id, onUserMessageSubmitted);
    setActivity(`会议来信已投递 Qwen 并唤醒: ${resp.filename}`);
    return true;
  } catch (wakeErr) {
    traceSubmissionFailure(wakeErr, resp.delivery_id);
    if (wakeErr.message && wakeErr.message.includes("CALLBACK_UNCONFIRMED")) {
      setActivity(`NEEDS_HUMAN：消息已提交，但 ACK 未闭环: ${resp.filename}`);
    } else {
      const errText = String(wakeErr?.message || wakeErr);
      const uncertain = errText.includes("SUBMISSION_UNCERTAIN");
      if (!uncertain && !submissionConfirmed && activeReplyDeliveryId === resp.delivery_id) {
        releaseReplyLock("submission_unconfirmed");
      }
      if (!uncertain && !submissionConfirmed && resp.delivery_id) {
        localExecutedDeliveryIds.delete(resp.delivery_id);
      }
      throw wakeErr;
    }
  }
  return false;
}

let isPullingTheta = false;
async function pollThetaIncoming() {
  if (!isQwen || isPullingTheta || killSwitchActive || qwenGenerationIsVisible()) return;
  const editor = qwenEditor();
  if (!editor || (editor.value || "").trim().length > 0) return;

  isPullingTheta = true;
  try {
    const resp = await send({ type: "bridge-theta-pull" });
    if (resp && resp.ok && resp.pending && resp.content) {
      await processThetaDelivery(resp);
    }
  } catch (e) {
    if (e.message && e.message.includes("404")) {
      setConnectionKey("panelVersionMismatch", "warning");
      setActivity("Theta 轮询失败 (HTTP 404)：VERSION_MISMATCH / RESTART_REQUIRED");
    }
  } finally {
    isPullingTheta = false;
  }
}

// 白名单真源＝桥端运行态（GET /api/v1/status 的 codeai_allowed_recipients / codeai_allowed_types）。
// 协议文本在注入时**取活值**，不落硬编码副本 ⇒ 桥端或 policy.json 改白名单，协议自动跟随。
// 取不到活值时明确告知「以桥端拒绝回执为准」，绝不写一份可能过期的枚举。
// @content-section delivery-bootstrap-text
async function fetchCodeAiWhitelist() {
  try {
    const data = await send({ type: "bridge-status" });
    if (!Array.isArray(data?.codeai_allowed_recipients) || !Array.isArray(data?.codeai_allowed_types)) return null;
    return {
      recipients: data.codeai_allowed_recipients.filter(Boolean),
      types: data.codeai_allowed_types.filter(Boolean),
      aliases: data.codeai_recipient_aliases || {},
    };
  } catch {
    return null;
  }
}

function codeaiWhitelistLines(whitelist) {
  if (!whitelist) {
    return [
      "合法 recipient / type 取值：本机桥此刻未应答，取不到活白名单。请勿凭记忆填写；若被拒，桥端拒绝回执会附上完整合法取值，照它改即可。",
    ];
  }
  const lines = [
    `合法 recipient 全集（只认这些，须逐字一致）：${whitelist.recipients.join(" / ")}。`,
    `type 规则（最省事的写法）：整行省略 type 字段即合法（桥端默认按 CUSTOM 处理）。若必须显式填写，只认以下大写枚举：${whitelist.types.join("/")}。小写或自造标签（如 ping、TEXT）会被桥端 400 拒收，整封信不落盘。`,
  ];
  const aliasPairs = Object.entries(whitelist.aliases)
    .filter(([from, to]) => from && to && from !== to)
    .map(([from, to]) => `${from}→${to}`);
  if (aliasPairs.length) lines.push(`常见别名（桥端自动归一）：${aliasPairs.join("；")}。`);
  return lines;
}

function collaborationProtocolBootstrap(requestId, whitelist) {
  return [
    `# PocketFleet 多AI协同交互规范`,
    `启动请求ID: ${requestId}`,
    ``,
    `回复格式要求：以 [PFBus]re:{someone} 或 [PFBus][mailto:{someone}] 为开头（指明单一收件人），随后换行写正文。`,
    `例如：`,
    `[PFBus]re:@SomeoneBot`,
    `协同任务已确认，执行进展如下……`,
    ``,
    `收到本说明后，请仅回复：发信规范已加载`,
  ].join("\n");
}

