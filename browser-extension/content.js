// @content-section entry-listeners
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (retireIfSuperseded()) return false;
    if (message?.type === "bridge-content-status") {
      const editor = isQwen ? qwenEditor() : promptEditor();
      const busy = isQwen ? qwenGenerationIsVisible() : generationIsVisible() || doubaoConversationBusyReason();
      const failureReason = lastOutboundFailure ? `protocol_error_${lastOutboundFailure.reason}` : null;
      const currentDraftText = editor ? editorText(editor).trim() : "";
      const hasDraft = Boolean(currentDraftText);
      const hasTelegramPendingDraft = Boolean(
        currentDraftText && (
          currentDraftText.startsWith("[PFBus]") ||
          currentDraftText.includes("This message arrived through [PFBus]")
        )
      );
      sendResponse({ ok: true, adapter: adapterProfile?.id || null,
        reason: globalThis.PocketFleetStudioReserved ? 'studio_verification' : !editor ? 'missing_editor'
          : busy ? 'generating' : killSwitchActive !== false ? 'bridge_status_unavailable'
          : routeBaselinePending ? 'history_loading' : activeReplyDeliveryId ? (failureReason || 'awaiting_protocol_reply') : isPullingCodeAi || isPullingTheta ? 'delivery_in_progress' : hasTelegramPendingDraft ? 'telegram_draft_in_progress' : (hasDraft ? 'ready_with_draft' : 'ready'),
        ready: Boolean(!globalThis.PocketFleetStudioReserved && editor && !busy
          && killSwitchActive === false && !routeBaselinePending && !activeReplyDeliveryId && !isPullingCodeAi && !isPullingTheta && !hasTelegramPendingDraft),
        lastFailure: lastOutboundFailure,
        protocolVersion: CONTENT_PROTOCOL_VERSION });
      return false;
    }
    if (message?.type === "bridge-reset-reply-lock") {
      releaseReplyLock(message?.reason || "manual_reset");
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === "bridge-background-tick") {
      (async () => {
        await refreshStatus();
        return { ok: true };
      })().then(sendResponse).catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    if (message?.type === "bridge-push-delivery") {
      (async () => {
        if (sender.id !== chrome.runtime.id || message.principal !== adapterProfile?.principal || message.sourceKey !== pageRouteKey()) {
          return { ok: false, error: "delivery principal mismatch" };
        }
        if (globalThis.PocketFleetStudioReserved || killSwitchActive !== false || routeBaselinePending || activeReplyDeliveryId || isPullingCodeAi || isPullingTheta
          || generationIsVisible() || (isQwen && qwenGenerationIsVisible())) {
          return { ok: false, error: "page not ready" };
        }
        if (isQwen) {
          isPullingTheta = true;
          try { return { ok: true, processed: await processThetaDelivery(message.delivery) }; }
          finally { isPullingTheta = false; }
        } else {
          isPullingCodeAi = true;
          try { return { ok: true, processed: await processCodeAiDelivery(message.delivery) }; }
          finally { isPullingCodeAi = false; }
        }
      })()
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
      return true;
    }
    if (message?.type !== "bridge-start-collaboration-protocol") return false;
    if (sender.id !== chrome.runtime.id || !message.humanGesture) {
      sendResponse({ ok: false, error: "启动请求来源被拒绝。" });
      return false;
    }

    injectCollaborationProtocol()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error.message || error) }));
    return true;
  });
}

// @content-section entry-startup
if (typeof window !== "undefined" && typeof document !== "undefined") {
  activePageRoute = pageRouteKey();
  // 必须立即进入路由基线锁定！SPA 异步拉取历史消息水合期间，绝对禁止任何扫描出站！
  routeBaselinePending = true;
  scheduleRouteBaseline();
  pageObserver = new MutationObserver(handlePageMutation);
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  loadPanelLocale(); // 先发后至：面板先以缺省英语渲染，IPC 回来整体换语
  panel();
  refreshStatus(); // 首发即显示「检测中」，并自此接管轮询链（自带离线退避调度）
  // 快速前导心跳补偿（注入 600ms 与 2000ms 各补发一次）：silent 不闪态，仅在首发未回或状态已变时落地
  setTimeout(() => { if (!retireIfSuperseded()) refreshStatus({ silent: true }); }, 600);
  setTimeout(() => { if (!retireIfSuperseded()) refreshStatus({ silent: true }); }, 2000);
  // 若打开在首页（如 DeepSeek 根路径），自动尝试承接选择侧边栏最新历史会话
  tryAutoSelectLatestSession();
  const schedule = (callback, intervalMs) => managedIntervals.push(setInterval(() => {
    if (retireIfSuperseded()) return;
    callback();
  }, intervalMs));
  // refreshStatus 的轮询链改由自身 finally 自调度（离线指数退避 5s→60s 封顶），不再挂固定 5s interval
  schedule(runPageScan, 3000);
  // The Worker exclusively consumes deliveries; page timers only scan replies.
  visibilityHandler = () => {
    if (!document.hidden && !retireIfSuperseded()) {
      refreshStatus();
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("focus", () => {
    if (!retireIfSuperseded()) {
      refreshStatus();
    }
  });
}

// @content-section entry-exports
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    findTelegramHeaderIndex,
    extractTelegramText,
    isThinkingElement,
    isElementVisible,
    findForbiddenAncestor,
    BLOCK_TAGS,
    getEnclosingBlock,
    collectVisibleNonThinkingTextNodes,
    evaluateSubmitConfirmation,
    isSelfCorrectableRejection,
    LOCAL_NOTICE_PREFIX,
    safeParseJson,
    normalizeStructuralJsonQuotes,
    normalizeJsonTypography,
    inspectJsonObjects,
    inspectThetaMessage,
    hasThetaHeader,
    parseThetaMessage,
    extractJsonObjects,
    scanThetaCalls,
    markExistingCallsHandled,
    qwenAssistantMessages,
    evaluateMessageFinalization,
    getOrCreateMessageState,
    messageStates,
    handled,
    executedMessages,
    inFlightRequests,
    THETA_HEADER,
    STABILITY_WINDOW_MS,
    PAGE_SCAN_DEBOUNCE_MS,
    ROUTE_BASELINE_QUIET_MS,
    pageRouteKey,
    editorText,
    messagesByRole,
    replyMatchesSubmittedTurn,
    submittedTurnMatches,
    assertSubmissionCurrent,
    retireIfSuperseded,
    panel,
    ownsPanel,
    isSupersededByOtherInstance,
    refreshStatus,
    handlePageMutation,
    panelConnection: () => ({ key: connectionKey, state: connectionState, detail: connectionDetail }),
    statusPollDelay: nextStatusPollDelay,
    pageScanPending: () => pageScanTimer !== null,
    clearRouteBaselineForTest: () => { routeBaselinePending = false; },
    CONTENT_INSTANCE_ID,
    isBridgeInstanceActive: () => bridgeInstanceActive,
    setKillSwitchActive: (v) => { killSwitchActive = v; },
    parseAndValidateEnvelope,
    truncateAtMessageActions,
    releaseReplyLock,
    getLastOutboundFailure: () => lastOutboundFailure,
    processCodeAiDelivery,
    injectCollaborationProtocol,
    PANEL_I18N,
    panelT,
    applyPanelLocale,
  };
}
