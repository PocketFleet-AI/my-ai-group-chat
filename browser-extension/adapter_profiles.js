/* Maintainer-owned browser adapter profiles. Page content cannot modify this file. */
globalThis.CHAT_AI_ADAPTER_PROFILES = Object.freeze([
  Object.freeze({
    id: "chatgpt-folded-host",
    principal: "folded-host-chatgpt-web",
    origins: Object.freeze(["https://chatgpt.com"]),
    macros: Object.freeze({ action: "[#bridge:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[0],
    inputKind: "contenteditable",
    pollingMs: 10000,
    stabilityWindowMs: 600,
    submitTimeoutMs: 15000,
    wakeTimeoutMs: 30000,
  }),
  Object.freeze({
    id: "claude-web",
    principal: "claude-web",
    origins: Object.freeze(["https://claude.ai"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[1],
    inputKind: "contenteditable",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "qwen-theta",
    principal: "qwen-theta-web",
    origins: Object.freeze(["https://chat.qwen.ai"]),
    macros: Object.freeze({ action: "[#theta:v1]", receipt: "[#theta_receipt:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[2],
    inputKind: "textarea",
    pollingMs: 10000,
    stabilityWindowMs: 600,
    submitTimeoutMs: 15000,
    wakeTimeoutMs: 30000,
  }),
  Object.freeze({
    id: "doubao-heart",
    principal: "doubao-heart-web",
    origins: Object.freeze(["https://www.doubao.com"]),
    exclusiveGroup: "doubao-heart-sandbox",
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[3],
    inputKind: "contenteditable",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "glm-xingtu",
    principal: "glm-xingtu-web",
    origins: Object.freeze(["https://chatglm.cn"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[4],
    inputKind: "textarea",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "gemini-earth-sandbox",
    principal: "gemini-earth-sandbox-web",
    origins: Object.freeze(["https://gemini.google.com"]),
    pathPrefixes: Object.freeze(["/app/02502fd61cd15871", "/app"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[5],
    inputKind: "contenteditable",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "copilot-grayfold",
    principal: "copilot-grayfold-web",
    origins: Object.freeze(["https://copilot.com", "https://copilot.microsoft.com"]),
    pathPrefixes: Object.freeze(["/chat/conversation/zGMWTVvDZw4hj9ZZEkZLH", "/chat/conversation", "/chat", "/chats/zGMWTVvDZw4hj9ZZEkZLH", "/chats", "/"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[6],
    inputKind: "textarea",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "deepseek-remainder",
    principal: "deepseek-remainder-web",
    origins: Object.freeze(["https://chat.deepseek.com"]),
    pathPrefixes: Object.freeze(["/a/chat/s/7d16aa10-17d4-4cad-8e50-9c912c3f73dc", "/a/chat", "/"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[7],
    inputKind: "textarea",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
  }),
  Object.freeze({
    id: "kimi-motin",
    principal: "kimi-motin-web",
    origins: Object.freeze(["https://kimi.moonshot.cn", "https://www.kimi.com"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[8],
    inputKind: "contenteditable",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "qwen-theta",
    principal: "qwen-theta-web",
    origins: Object.freeze([
      "https://chat.qwen.ai",
      "https://tongyi.aliyun.com",
      "https://tongyi.ai",
      "https://qwen.ai",
    ]),
    // A distinct data key preserves this fallback without changing its identity.
    selectorKey: "qwen-theta-tongyi",
    macros: Object.freeze({ action: "[#theta:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[9],
    inputKind: "textarea",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
  Object.freeze({
    id: "grok-web",
    principal: "grok-web",
    origins: Object.freeze(["https://grok.com", "https://www.grok.com"]),
    macros: Object.freeze({ action: "[#codeai:v1]" }),
    selectors: globalThis.FEATURE_SELECTOR_DEFINITIONS[10],
    inputKind: "contenteditable",
    pollingMs: 15000,
    stabilityWindowMs: 800,
    responseStabilityMs: 5000,
    submitTimeoutMs: 20000,
    wakeTimeoutMs: 45000,
  }),
]);

globalThis.resolveChatAiAdapterProfile = function resolveChatAiAdapterProfile(url) {
  try {
    const parsed = new URL(url);
    const profile = globalThis.CHAT_AI_ADAPTER_PROFILES.find((candidate) => (
      candidate.origins.includes(parsed.origin)
      && (!candidate.pathPrefixes || candidate.pathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix)))
    )) || null;
    if (!profile?.pathSenderLabels) return profile;
    const matchedPath = Object.keys(profile.pathSenderLabels).find((path) => (
      parsed.pathname.startsWith(path)
    ));
    return Object.freeze({
      ...profile,
      senderLabel: matchedPath ? profile.pathSenderLabels[matchedPath] : null,
    });
  } catch {
    return null;
  }
};
