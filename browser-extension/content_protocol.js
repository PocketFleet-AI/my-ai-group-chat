// @content-section protocol-json
function parseCall(code) {
  return parseCallText(code.textContent);
}

function normalizeJsonTypography(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[\u201c\u201d\u201e\u201f\u00ab\u00bb]/g, '"')
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, "-");
}

function normalizeStructuralJsonQuotes(text) {
  if (typeof text !== "string") return "";
  let s = text.replace(/｛/g, "{").replace(/｝/g, "}");
  s = s.replace(/([{\[,:]\s*)[“\u201c\u201d\u201e\u201f]/g, '$1"');
  s = s.replace(/[“\u201c\u201d\u201e\u201f](\s*[:,\}\]])/g, '"$1');
  return s;
}

function safeParseJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  try {
    return JSON.parse(normalizeStructuralJsonQuotes(trimmed));
  } catch {}

  try {
    return JSON.parse(normalizeJsonTypography(trimmed));
  } catch {}

  return null;
}

function parseCallText(text) {
  try {
    const parsed = safeParseJson(text);
    const call = parsed?.[CALL_KEY];
    if (!call || typeof call.request_id !== "string" || typeof call.tool !== "string") return null;
    if (!call.arguments || typeof call.arguments !== "object" || Array.isArray(call.arguments)) return null;
    return call;
  } catch {
    return null;
  }
}

function inspectJsonObjects(text) {
  const objects = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let quoteChar = null;
  let escaped = false;
  let hasLeadingText = false;
  let hasTrailingText = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (start < 0) {
      if (/\s/.test(character)) continue;
      if (character !== "{" && character !== "｛") {
        if (objects.length === 0) {
          hasLeadingText = true;
        } else {
          hasTrailingText = true;
        }
        continue;
      }
      start = index;
      depth = 1;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (
        character === quoteChar ||
        (quoteChar === '“' && character === '”') ||
        (quoteChar === '”' && character === '“')
      ) {
        inString = false;
        quoteChar = null;
      }
      continue;
    }

    if (character === '"' || character === '“' || character === '”') {
      inString = true;
      quoteChar = character;
    } else if (character === "{" || character === "｛") {
      depth += 1;
    } else if (character === "}" || character === "｝") {
      depth -= 1;
      if (depth === 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  const isIncomplete = (start >= 0 && depth > 0) || (objects.length === 0 && !hasLeadingText && text.trim().length === 0);
  return {
    objects,
    isIncomplete,
    hasLeadingText,
    hasTrailingText,
    hasNonWhitespaceNonBrace: hasLeadingText || hasTrailingText,
  };
}

function extractJsonObjects(text) {
  return inspectJsonObjects(text).objects;
}

function hasBridgeHeader(message) {
  const content = message.textContent.trimStart();
  if (!content.startsWith(BRIDGE_HEADER)) return false;
  const nextCharacter = content.slice(BRIDGE_HEADER.length, BRIDGE_HEADER.length + 1);
  return !nextCharacter || /\s/.test(nextCharacter);
}

function callsFromMessage(message) {
  const codeCalls = [...message.querySelectorAll("pre code")].map(parseCall).filter(Boolean);
  if (codeCalls.length > 0) return codeCalls;
  const content = message.textContent.trimStart();
  const body = content.slice(BRIDGE_HEADER.length);
  return extractJsonObjects(body).map(parseCallText).filter(Boolean);
}

// @content-section protocol-codeai-header
const CODEAI_HEADER = "[#codeai:v1]";
// @content-section protocol-codeai
function hasCodeAiHeader(message) {
  if (!message) return false;
  const content = (message.textContent || "").trimStart();
  if (!content.includes(CODEAI_HEADER)) return false;
  const idx = content.indexOf(CODEAI_HEADER);
  const tail = content.slice(idx + CODEAI_HEADER.length).trimStart();
  if (!tail || tail.startsWith("{") || tail.startsWith("｛") || tail.startsWith("<") || /^\s/.test(content.slice(idx + CODEAI_HEADER.length, idx + CODEAI_HEADER.length + 1))) {
    return true;
  }
  return tail.includes("codeai_message") || tail.includes("theta_codeai_message");
}

function codeaiMsgFromParsed(obj) {
  // 优先信封格式 {"codeai_message": {...}}；兜底裸格式 {..., message_id, content}。
  // 背景：结算主机主会话恢复后曾输出裸 JSON（2026-09-15 实测），旧解析恒 null ⇒ 出站静默丢失。
  if (obj?.codeai_message?.message_id) return obj.codeai_message;
  if (typeof obj?.message_id === "string" && obj.message_id && typeof obj?.content === "string") return obj;
  return null;
}

function parseCodeAiMessage(message) {
  if (!message) return null;
  const codeBlocks = message.querySelectorAll ? [...message.querySelectorAll("pre code, pre, code")] : [];
  for (const block of codeBlocks) {
    const blockText = (block.textContent || "").trimStart();
    if (blockText.includes(CODEAI_HEADER)) {
      const idx = blockText.indexOf(CODEAI_HEADER);
      const body = blockText.slice(idx + CODEAI_HEADER.length);
      const jsonStrs = extractJsonObjects(body);
      for (const s of jsonStrs) {
        try {
          const obj = safeParseJson(s);
          if (codeaiMsgFromParsed(obj)) return codeaiMsgFromParsed(obj);
        } catch {}
      }
    }
    const jsonStrs = extractJsonObjects(blockText);
    for (const s of jsonStrs) {
      try {
        const obj = safeParseJson(s);
        if (codeaiMsgFromParsed(obj)) return codeaiMsgFromParsed(obj);
      } catch {}
    }
  }

  const content = (message.textContent || "").trimStart();
  const idx = content.indexOf(CODEAI_HEADER);
  if (idx >= 0) {
    const body = content.slice(idx + CODEAI_HEADER.length);
    const jsonStrs = extractJsonObjects(body);
    for (const s of jsonStrs) {
      try {
        const obj = safeParseJson(s);
        if (codeaiMsgFromParsed(obj)) return codeaiMsgFromParsed(obj);
      } catch {}
    }
  }
  return null;
}

// ── C：出站失败的「回程」（2026-09-16 指挥官批准）────────────────────────────
// 结构性缺陷：发信被桥拒绝时，扩展只把原因写进页面浮层（给人看）；写信的
// 那个节点自己收不到任何反馈 ⇒ 只能靠人每次去提醒它。
// 补丁：失败时把桥的拒绝原因**注入该节点自己的聊天窗**，节点读到后可自纠重发。
// 三条硬边界（缺一条都会出问题）：
//   1. 只在**节点可自纠的载荷类拒绝**时注入（白名单式判定）。404 / 503 / PAUSED
//      属控制链故障，节点改了也没用 ⇒ 不注入，不白烧它的 token。
//   2. 注入文本**不含** [#codeai:v1] / [#theta:v1] 宏头，故不会被 scanCodeAiCalls
//      当成新信件再投递一次 ⇒ 无死循环。
//   3. 成功路径**保持不注入**：实测成功回执会诱发 AI 寒暄轮（白烧一轮，
//      见 pollThetaIncoming 注释）。只有失败才值得烧这一轮。
// @content-section protocol-theta
const THETA_FALLBACK_UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function parseThetaMessageFromCodeBlocks(message) {
  if (!message || !message.querySelectorAll) return null;
  const blocks = [...message.querySelectorAll("pre code, pre, code")];
  for (const block of blocks) {
    if (isThinkingElement(block) || isInsideThinking(block, message) || isInsideHidden(block, message)) continue;
    const blockText = (block.textContent || "").trimStart();
    if (!blockText.includes(THETA_HEADER)) continue;
    const idx = blockText.indexOf(THETA_HEADER);
    const body = blockText.slice(idx + THETA_HEADER.length);
    const jsonStrs = extractJsonObjects(body);
    for (const s of jsonStrs) {
      try {
        const obj = safeParseJson(s);
        const thetaMsg = obj?.theta_codeai_message;
        if (thetaMsg && thetaMsg.message_id && THETA_FALLBACK_UUID_V4_RE.test(String(thetaMsg.message_id))) return thetaMsg;
      } catch {}
    }
  }
  return null;
}

function inspectThetaMessage(message, { isGenerating = false } = {}) {
  if (!message || message.nodeType !== 1) {
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: null };
  }

  const allText = message.textContent || "";
  if (!allText.includes(THETA_HEADER)) {
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: null };
  }

  // Collect text nodes belonging strictly to visible, non-thinking areas with block tracking
  const entries = collectVisibleNonThinkingTextNodes(message);
  if (entries.length === 0) {
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: "非最终答案块" };
  }

  // Find the first non-empty text node
  let firstNonEmptyIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    const val = entries[i].node.nodeValue || entries[i].node.textContent || "";
    if (val.trim().length > 0) {
      firstNonEmptyIndex = i;
      break;
    }
  }

  if (firstNonEmptyIndex === -1) {
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: "非最终答案块" };
  }

  const firstEntry = entries[firstNonEmptyIndex];
  const firstVal = firstEntry.node.nodeValue || firstEntry.node.textContent || "";
  const trimmedFirst = firstVal.trimStart();

  if (!trimmedFirst.startsWith(THETA_HEADER)) {
    // 宏在消息里但不在最前 —— 先尝试代码块兜底提取，再拒收（P2 容错）
    const fallback = parseThetaMessageFromCodeBlocks(message);
    if (fallback) {
      return { hasHeader: true, valid: true, isIncomplete: false, payload: fallback, rejectionReason: null };
    }
    // Macro header was present in message (e.g. in thinking area, or preceded by normal text in answer)
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: "宏不在回复最前，且代码块中无有效信件" };
  }

  // Verify that the first entry's text node is NOT inside pre/code/blockquote
  const forbidden = findForbiddenAncestor(firstEntry.node, message);
  if (forbidden) {
    // 宏在代码块/引用块内 —— 尝试代码块兜底提取（P2 容错），失败才拒收
    const fallback = parseThetaMessageFromCodeBlocks(message);
    if (fallback) {
      return { hasHeader: true, valid: true, isIncomplete: false, payload: fallback, rejectionReason: null };
    }
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: "宏位于代码块/引用块内，但未解析出有效信件" };
  }

  // Header boundary check within the first node:
  // If there are characters immediately after THETA_HEADER in this node, they MUST start with whitespace!
  // If the node ends right after THETA_HEADER (e.g. <p>[#theta:v1]</p>), that is also completely valid.
  const afterHeaderInFirst = trimmedFirst.slice(THETA_HEADER.length);
  // P2 容错（与 codeai 路径对齐）：允许 [#theta:v1]{...} 紧贴 JSON 的紧凑形态
  const compactBody = afterHeaderInFirst.trimStart();
  if (afterHeaderInFirst.length > 0 && !/\s/.test(afterHeaderInFirst[0]) && !compactBody.startsWith("{") && !compactBody.startsWith("｛")) {
    return { hasHeader: false, valid: false, isIncomplete: false, payload: null, rejectionReason: "格式错误" };
  }

  const hasHeader = true;

  // Construct body:
  // Start with remainder of the first node
  let body = afterHeaderInFirst;
  let prevBlock = firstEntry.enclosingBlock;

  for (let i = firstNonEmptyIndex + 1; i < entries.length; i++) {
    const entry = entries[i];
    const val = entry.node.nodeValue || entry.node.textContent || "";
    if (entry.enclosingBlock !== prevBlock) {
      body += "\n";
      prevBlock = entry.enclosingBlock;
    }
    body += val;
  }

  const { objects, isIncomplete: jsonIncomplete, hasLeadingText, hasTrailingText } = inspectJsonObjects(body);

  if (isGenerating) {
    // While generating, NEVER finalize or permanently reject!
    return { hasHeader: true, valid: false, isIncomplete: true, payload: null, rejectionReason: null };
  }

  if (objects.length > 1) {
    return { hasHeader: true, valid: false, isIncomplete: false, payload: null, rejectionReason: "多 JSON" };
  }

  if (hasLeadingText || hasTrailingText) {
    return { hasHeader: true, valid: false, isIncomplete: false, payload: null, rejectionReason: "格式错误" };
  }

  if (objects.length === 0) {
    if (jsonIncomplete) {
      return { hasHeader: true, valid: false, isIncomplete: true, payload: null, rejectionReason: null };
    }
    return { hasHeader: true, valid: false, isIncomplete: false, payload: null, rejectionReason: "格式错误" };
  }

  if (jsonIncomplete) {
    return { hasHeader: true, valid: false, isIncomplete: true, payload: null, rejectionReason: null };
  }

  try {
    const parsed = safeParseJson(objects[0]);
    const thetaMsg = parsed?.theta_codeai_message;
    if (!thetaMsg || typeof thetaMsg !== "object" || !thetaMsg.message_id) {
      return { hasHeader: true, valid: false, isIncomplete: false, payload: null, rejectionReason: "格式错误" };
    }
    return {
      hasHeader: true,
      valid: true,
      isIncomplete: false,
      payload: thetaMsg,
      rejectionReason: null,
    };
  } catch {
    return { hasHeader: true, valid: false, isIncomplete: false, payload: null, rejectionReason: "格式错误" };
  }
}

function hasThetaHeader(message) {
  const inspection = inspectThetaMessage(message);
  return inspection.hasHeader;
}

function parseThetaMessage(message) {
  const inspection = inspectThetaMessage(message);
  return inspection.payload;
}

// @content-section protocol-telegram
const SCHEME_POCKETFLEET_RE = /^[ \t]{0,3}(?:\*\*|__)?\[pfbus\](?:\*\*|__)?\s*(?:re:|\[mailto:)/i;
// PFBus header
const TELEGRAM_HEAD_RE = /^[ \t]{0,3}(?:\[pfbus\](?:\s*\[noreply\])?|\*\*\[pfbus\]\*\*)[ \t]*/i;

function normalizeEnvelopePrefix(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (trimmed.startsWith('>') || trimmed.startsWith('~~~')) return null;
  const match = trimmed.match(/^[*_ \t\-0-9.]+/);
  const prefixLen = match ? match[0].length : 0;
  if (prefixLen > 6) return null; // 严格 6 字符窗口
  const clean = trimmed.slice(prefixLen);
  const low = clean.toLowerCase();
  if (low.startsWith('[pfbus]') || low.startsWith('/meetover') || low.startsWith('/rules')) {
    return clean;
  }
  return null;
}

function isTelegramEnvelopeHeaderLine(line) {
  const clean = normalizeEnvelopePrefix(line);
  if (!clean) return false;
  const low = clean.toLowerCase();
  if (/\/(?:meetover|rules)\b/i.test(low)) return true;
  if (/(?:\[report\]|\breport\b)/i.test(low)) return true;
  const hasTarget = /(?:\[mailto:|\bre:|to:|\[to:)/i.test(low);
  const hasMode = /\[(?:waitReply|NoReply|ready)\]/i.test(low);
  return hasTarget && hasMode;
}

function containsValidEnvelopeHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (trimmed.startsWith('>') || trimmed.startsWith('~~~')) return false;
  const low = trimmed.toLowerCase();
  const idxBus = low.indexOf('[pfbus]');
  const idxMeet = low.indexOf('/meetover');
  const idxRules = low.indexOf('/rules');
  if (idxBus === -1 && idxMeet === -1 && idxRules === -1) return false;

  if (/\/(?:meetover|rules)\b/i.test(low)) return true;
  if (/(?:\[report\]|\breport\b)/i.test(low)) return true;
  const hasTarget = /(?:\[mailto:|\bre:|to:|\[to:)/i.test(low);
  const hasMode = /\[(?:waitReply|NoReply|ready)\]/i.test(low);
  return hasTarget && hasMode;
}

function splitTelegramLetters(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];

  let start = 0;
  let inFence = false;

  // 第一阶段：锚定首个合法信封行（段首 6 字窗口，或首信带前缀寒暄有效信封）
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed || trimmed.startsWith('>')) continue;
    if (isTelegramEnvelopeHeaderLine(trimmed)) {
      start = i;
      break;
    }
    // 游隼红队 P1 修复：首信带寒暄前缀（如「好的[PFBus][mailto:@A]...」）
    if (containsValidEnvelopeHeader(trimmed)) {
      start = i;
      break;
    }
  }

  const letters = [];
  let currentStart = start;
  inFence = false;

  // 第二阶段：从首信起点开始，仅对后续再次出现的独立信封行进行多信件切分
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && i > currentStart && isTelegramEnvelopeHeaderLine(trimmed)) {
      const chunk = lines.slice(currentStart, i).join('\n').trim();
      if (chunk) letters.push(chunk);
      currentStart = i;
    }
  }

  const lastChunk = lines.slice(currentStart).join('\n').trim();
  if (lastChunk) letters.push(lastChunk);

  return letters.length > 0 ? letters : [text.trim()];
}

function parseAndValidateEnvelope(raw) {
  if (!raw || typeof raw !== 'string') return { ok: false, error: 'empty_input' };
  let sanitized = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (/^```[a-zA-Z0-9_-]*\s*\n\s*\[?pfbus\]?/i.test(sanitized)) {
    sanitized = sanitized.replace(/^```[a-zA-Z0-9_-]*\s*\n/, '').replace(/\n\s*```\s*$/, '').trim();
  }

  const chunks = splitTelegramLetters(sanitized);
  if (chunks.length > 1) {
    const results = [];
    let hasControl = false;
    for (const chunk of chunks) {
      const res = parseAndValidateSingleEnvelope(chunk);
      if (!res.ok) {
        // 游隼红队 P1-1 吸收：逐信隔离降级，非信封段落降级为原文保留，绝不整批一票否决导致丢件
        results.push({
          ok: true,
          target: '@all',
          mode: 'NoReply',
          body: chunk,
          normalizedText: chunk,
          isDegraded: true
        });
      } else {
        if (res.action === 'meetover' || res.action === 'rules') {
          hasControl = true;
        }
        results.push(res);
      }
    }
    const normalizedText = results.map((r) => r.normalizedText).join('\n\n');
    return {
      ok: true,
      isBatch: true,
      hasControl: hasControl,
      letters: results,
      target: results[0].target,
      mode: results[0].mode,
      normalizedText: normalizedText,
    };
  }

  return parseAndValidateSingleEnvelope(sanitized);
}

function parseAndValidateSingleEnvelope(raw) {
  if (!raw || typeof raw !== 'string') return { ok: false, error: 'empty_input' };
  let sanitized = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // 容忍 AI 将格式化信封包裹在 markdown 代码块中输出 (例如 ```plaintext\n[PFBus]...\n```)
  if (/^```[a-zA-Z0-9_-]*\s*\n\s*\[?pfbus\]?/i.test(sanitized)) {
    sanitized = sanitized.replace(/^```[a-zA-Z0-9_-]*\s*\n/, '').replace(/\n\s*```\s*$/, '').trim();
  }
  const lines = sanitized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: false, error: 'empty_lines' };

  if (lines[0].startsWith('>') || lines[0].startsWith('~~~')) {
    return { ok: false, error: 'quoted_or_code_block' };
  }
  if (lines[0].startsWith('```')) {
    if (lines.length > 1 && /^(?:\*\*|__)?\[?pfbus\]?/i.test(lines[1])) {
      lines.shift();
      if (lines.length > 0 && lines[lines.length - 1].startsWith('```')) {
        lines.pop();
      }
    } else {
      return { ok: false, error: 'quoted_or_code_block' };
    }
  }

  let headerIndex = -1;
  let detectedHeader = '';
  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const low = lines[i].toLowerCase();
    const idxBus = low.indexOf('[pfbus]');
    const idxMeet = low.indexOf('/meetover');
    const idxRules = low.indexOf('/rules');
    const indices = [idxBus, idxMeet, idxRules].filter((idx) => idx >= 0);
    if (indices.length > 0) {
      const bestIdx = Math.min(...indices);
      headerIndex = i;
      detectedHeader = lines[i].slice(bestIdx);
      break;
    }
  }
  if (headerIndex === -1) return { ok: false, error: 'missing_protocol_header' };

  let headerLine = detectedHeader;
  let restLines = lines.slice(headerIndex + 1);
  while (restLines.length > 0 && /^```\s*$/.test(restLines[restLines.length - 1])) {
    restLines.pop();
  }

  if (/^(?:\*\*|__)?\[?pfbus\]?(?:\*\*|__)?\s*$/i.test(headerLine) && restLines.length > 0) {
    if (/(?:\[mailto:|\bre:|to:|\[to:)/i.test(restLines[0])) {
      headerLine = headerLine + ' ' + restLines[0];
      restLines = restLines.slice(1);
    }
  }

  if (/\/(?:meetover)\b/i.test(headerLine)) {
    return { ok: true, isCommand: true, normalizedText: '/meetover', command: 'meetover' };
  }
  if (/\/(?:rules)\b/i.test(headerLine)) {
    const fullRules = [headerLine, ...restLines].join('\n').trim();
    return { ok: true, isCommand: true, normalizedText: fullRules, command: 'rules' };
  }

  if (/(?:\[report\]|\breport\b)/i.test(headerLine)) {
    const nickMatch = /(?:\[nickname:|nickname:)\s*([^\s\];]+)/i.exec(headerLine);
    const nickname = nickMatch ? nickMatch[1].trim() : '';
    const isReady = /(?:\[ready\]|\bready\b)/i.test(headerLine);
    let bodyText = restLines.length > 0 ? restLines.join('\n').trim() : '可以参会。';
    bodyText = bodyText.replace(/\n?```\s*$/, '').trim();
    return {
      ok: true,
      isReport: true,
      nickname,
      ready: isReady,
      target: '',
      mode: 'NoReply',
      body: bodyText,
      normalizedText: `[PFBus];[report];[nickname:${nickname}]${isReady ? ';[ready]' : ''}\n${bodyText}`,
    };
  }

  const hasExplicitTarget = /(?:\[mailto:|\bre:|to:|\[to:)/i.test(headerLine);
  const targetMatch = /(?:\[mailto:|\bre:|to:|\[to:)\s*([^\s\];，,]+)/i.exec(headerLine);
  const target = targetMatch ? targetMatch[1].trim() : '';

  const ccMatch = /(?:\[(?:cc|mailcc):|(?:cc|mailcc):)\s*([^\s\];]+)/i.exec(headerLine);
  const ccList = ccMatch
    ? ccMatch[1].split(/[,，]/).map((s) => s.trim()).filter((s) => s && !/^nobody$/i.test(s))
    : [];

  const hasWait = /\[?waitReply\]?/i.test(headerLine);
  const hasNo = /\[?noReply\]?/i.test(headerLine);
  const isAck = /\[?ack\]?/i.test(headerLine);

  if (hasExplicitTarget && !target) {
    return { ok: false, error: 'invalid_recipient', rawHeader: headerLine };
  }
  if (target && /^@?(?:targetbot|someonebot|botusername|xxxx)$/i.test(target)) {
    return { ok: false, error: 'placeholder_recipient_forbidden', rawHeader: headerLine };
  }
  if (hasWait && hasNo) {
    return { ok: false, error: 'conflicting_reply_modes', rawHeader: headerLine };
  }

  const isBroadcast = !target || isAck;
  const mode = hasWait && !isBroadcast ? 'waitReply' : 'NoReply';

  let inlineBody = headerLine
    .replace(/^(?:\*\*|__)?\[?pfbus\]?(?:\*\*|__)?/i, '')
    .replace(/(?:\[mailto:[^\]]+\]|re:[^;\s]+|to:[^;\s]+|\[to:[^\]]+\])/i, '')
    .replace(/(?:\[(?:cc|mailcc):[^\]]+\]|(?:cc|mailcc):[^;\s]+)/i, '')
    .replace(/\[?(?:waitReply|NoReply)\]?/gi, '')
    .replace(/\[?ack\]?/gi, '')
    .replace(/[;；\s]+/g, ' ')
    .trim();

  // 2026-10-16 残头清理（游隼）：AI 用非协议字段写信封时，首行剥离已知 token 后的
  // 残留是协议噪音而非正文。仅在「无有效收件人＋残留呈字段结构＋有独立正文行」
  // 三个条件同时成立时丢弃残头；`[PFBus] hello` 这类正文写在一行的情况不受影响。
  if (!target && restLines.length > 0 && /[:：]\s*[\[(]|\/\/|\[\]/.test(inlineBody)) {
    inlineBody = '';
  }

  const bodyParts = [];
  if (inlineBody) bodyParts.push(inlineBody);
  if (restLines.length > 0) bodyParts.push(restLines.join('\n').trim());
  const body = bodyParts.join('\n').trim();

  if (!body) return { ok: false, error: 'missing_body', rawHeader: headerLine };

  let normalizedHeader = '[PFBus]';
  if (target && !isBroadcast) {
    normalizedHeader += `[mailto:${target}]`;
    if (ccList.length > 0) normalizedHeader += `;[cc:${ccList.join(',')}]`;
    normalizedHeader += `;[${mode}]`;
  } else {
    normalizedHeader += ';[NoReply]';
  }

  return {
    ok: true,
    target: isBroadcast ? '' : target,
    cc: isBroadcast ? [] : ccList,
    mode,
    body,
    normalizedText: `${normalizedHeader}\n${body}`,
  };
}

function findTelegramHeaderIndex(lines) {
  const i = lines.findIndex((line) => line.trim());
  if (i < 0) return -1;
  const line = lines[i].trim();
  if (line.startsWith('>') || line.startsWith('`')) return -1;
  if (!/^(?:\*\*|__)?\[?pfbus\]?(?:\*\*|__)?/i.test(line)) return -1;
  if (/\/(?:rules|meetover)\b/i.test(line) || /\[report\]/i.test(line)) return i;
  const hasRecipient = /(?:\[mailto:|\bre:|to:|\[to:)/i.test(line);
  const hasMode = /\[(?:waitReply|NoReply)\]/i.test(line);
  if (hasRecipient && hasMode) return i;
  if (SCHEME_POCKETFLEET_RE.test(line) || TELEGRAM_HEAD_RE.test(line)) return i;
  return -1;
}

function isTelegramOutbound(raw) {
  const parsed = parseAndValidateEnvelope(raw);
  return parsed.ok;
}

function extractTelegramText(raw) {
  const parsed = parseAndValidateEnvelope(raw);
  return parsed.ok ? parsed.normalizedText : null;
}

