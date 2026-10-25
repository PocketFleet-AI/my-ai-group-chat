#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""浮层面板 i18n：面板文字跟随插件语言设置（pf_ui_locale，popup 语言菜单同一键）。

范围（指挥官 2026-10-14 令）：
  · 静态 UI 10 键：收起/最近动作/暂停·恢复/协同说明/重新检测/重试回传/收起态标签与标题；
  · 持久状态 6 键：检测中/在线/已暂停/版本不符/未连接/网桥未启动；
  · 动作反馈 7 键：暂停中·恢复中·已暂停·已恢复·控制失败/重申规范两态；
  · 守卫与拒绝 5 键：暂停拒执/中止提交/单工具调用/无输入框/输入框非空；
  · 适配器初始 3 键：无活动/Qwen 注入/Doubao 注入。
  共 31 键 × 8 语言（zh_CN/en/ja/ko/fr/de/es/pt），缺省英语（与 popup 一致）。
  ⏸ 延迟收敛：约 45 处舰队协议瞬时流水（CodeAi/Theta/OpenClaw/电报投递痕）本轮不翻。

架构（沿用 launch.js 模式，不引 fetch）：
  · 内联 PANEL_I18N 表 + panelT() 同步查表，缺 key 回退 en；
  · 连接态改「键 + 明细」存储（setConnectionKey/connectionText）——字符串存了就越描越漂，
    语言切换后重渲自动换语；
  · 模板静态文本 data-i18n 化，panel() 建面板即 applyPanelI18n；
  · loadPanelLocale() 读 pf_ui_locale 并整体换语；chrome.storage.onChanged 监听，
    popup 里改语言，已打开页面浮层实时跟随（测试桩无 onChanged，守卫跳过）。
CRLF 归一化 + 逐锚点计数断言 + 旧值清零断言。
"""
import os
import sys

raise SystemExit("Retired after content split. Edit content_i18n.js and run tools/build-content.cjs.")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
JS = os.path.join(ROOT, "browser-extension", "content.js")

PANEL_I18N_JS = '''/* ---------- 面板 i18n（内联 8 语言表 · 沿用 launch.js 模式） ----------
   缺省英语（与 popup 一致：指挥官令「缺省英语，不跟随浏览器语言」）；
   用户选择存 chrome.storage.local 的 pf_ui_locale（popup 语言菜单同一键）。
   同步查表、无 fetch 无竞态；缺 key 回退 en，新增语言加一行即可。 */
const LANG_PREF_KEY = "pf_ui_locale";
const PANEL_I18N = {
  zh_CN: {
    panelCollapse: "收起",
    panelCollapseTitle: "收起浮层",
    panelRecentActivity: "最近动作",
    panelPause: "暂停执行",
    panelResume: "恢复执行",
    panelInstructions: "协同说明",
    panelRecheck: "重新检测",
    panelRetry: "重试回传",
    panelCollapsedLabel: "PF 桥",
    panelExpandTitle: "展开 PocketFleet Bridge 浮层",
    panelChecking: "正在检测本地桥...",
    panelConnected: "控制链在线，协同网桥已就绪",
    panelPaused: "控制链在线，工具执行已暂停",
    panelVersionMismatch: "控制链在线，工具可以执行 | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "未连接：",
    panelBridgeOffline: "本地网桥未启动 (Port 18765 离线，请在控制面板启动 3. Web Extension Bridge)",
    panelNoActivity: "尚无工具活动",
    panelAdapterInjectedQwen: "Qwen 适配器已注入，未检测到新行动宏",
    panelAdapterInjectedDoubao: "豆包适配器已注入，等待会议来信",
    panelPausing: "正在暂停执行...",
    panelResuming: "正在恢复执行...",
    panelPausedDone: "执行已暂停",
    panelResumedDone: "执行已恢复",
    panelControlFailed: "控制失败：",
    panelReinjecting: "正在向 AI 重申发信规范...",
    panelReinjected: "已向 AI 重申发信规范，等待「发信规范已加载」回复",
    panelGuardBlocked: "控制链已暂停或状态未知，拒绝执行工具",
    panelGuardAbort: "控制链已暂停或状态未知，中止工具结果提交",
    panelRejectMultiTool: "已拒绝：一条 bridge 消息只能包含一个工具调用",
    panelNoEditor: "未找到输入框，页面适配器需要更新",
    panelEditorBusy: "输入框非空，已暂停自动拉取",
  },
  en: {
    panelCollapse: "Collapse",
    panelCollapseTitle: "Collapse the floating panel",
    panelRecentActivity: "Recent activity",
    panelPause: "Pause",
    panelResume: "Resume",
    panelInstructions: "Convention",
    panelRecheck: "Recheck",
    panelRetry: "Retry",
    panelCollapsedLabel: "PF Bridge",
    panelExpandTitle: "Expand the PocketFleet Bridge panel",
    panelChecking: "Checking local bridge...",
    panelConnected: "Control link online — collaboration bridge ready",
    panelPaused: "Control link online — tool execution paused",
    panelVersionMismatch: "Control link online — tools may run | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "Not connected: ",
    panelBridgeOffline: 'Local bridge not running (Port 18765 offline — start "3. Web Extension Bridge" in the control panel)',
    panelNoActivity: "No tool activity yet",
    panelAdapterInjectedQwen: "Qwen adapter injected — no new action macro yet",
    panelAdapterInjectedDoubao: "Doubao adapter injected — waiting for meeting mail",
    panelPausing: "Pausing...",
    panelResuming: "Resuming...",
    panelPausedDone: "Execution paused",
    panelResumedDone: "Execution resumed",
    panelControlFailed: "Control failed: ",
    panelReinjecting: "Re-sending the messaging convention to the AI...",
    panelReinjected: 'Convention re-sent to the AI — waiting for the "convention loaded" reply',
    panelGuardBlocked: "Control link paused or unknown — tool execution refused",
    panelGuardAbort: "Control link paused or unknown — tool result submission aborted",
    panelRejectMultiTool: "Rejected: a bridge message may contain only one tool call",
    panelNoEditor: "Input box not found — the page adapter needs an update",
    panelEditorBusy: "Input box not empty — auto-pull paused",
  },
  ja: {
    panelCollapse: "折りたたむ",
    panelCollapseTitle: "フローティングパネルを折りたたむ",
    panelRecentActivity: "最近のアクション",
    panelPause: "一時停止",
    panelResume: "再開",
    panelInstructions: "規約",
    panelRecheck: "再検出",
    panelRetry: "再送信",
    panelCollapsedLabel: "PF ブリッジ",
    panelExpandTitle: "PocketFleet Bridge パネルを展開",
    panelChecking: "ローカルブリッジを確認中...",
    panelConnected: "制御リンクオンライン・協調ブリッジ準備完了",
    panelPaused: "制御リンクオンライン・ツール実行は一時停止中",
    panelVersionMismatch: "制御リンクオンライン・ツール実行可 | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "未接続：",
    panelBridgeOffline: "ローカルブリッジが未起動です（Port 18765 オフライン。コントロールパネルで「3. Web Extension Bridge」を起動してください）",
    panelNoActivity: "ツールアクティビティはまだありません",
    panelAdapterInjectedQwen: "Qwen アダプター注入済み・新しいアクションマクロは未検出",
    panelAdapterInjectedDoubao: "Doubao アダプター注入済み・会議メール待機中",
    panelPausing: "一時停止中...",
    panelResuming: "再開中...",
    panelPausedDone: "実行を一時停止しました",
    panelResumedDone: "実行を再開しました",
    panelControlFailed: "制御に失敗しました：",
    panelReinjecting: "AIにメッセージ規約を再送信中...",
    panelReinjected: "規約をAIに再送信しました。「規約読み込み完了」の応答を待機中",
    panelGuardBlocked: "制御リンクが一時停止中または不明・ツール実行を拒否しました",
    panelGuardAbort: "制御リンクが一時停止中または不明・ツール結果の提出を中止しました",
    panelRejectMultiTool: "拒否：1つの bridge メッセージに含められるツール呼び出しは1件までです",
    panelNoEditor: "入力ボックスが見つかりません・ページアダプターの更新が必要です",
    panelEditorBusy: "入力ボックスが空ではありません・自動取得を一時停止しました",
  },
  ko: {
    panelCollapse: "접기",
    panelCollapseTitle: "플로팅 패널 접기",
    panelRecentActivity: "최근 활동",
    panelPause: "일시중지",
    panelResume: "재개",
    panelInstructions: "규약",
    panelRecheck: "다시 확인",
    panelRetry: "재전송",
    panelCollapsedLabel: "PF 브리지",
    panelExpandTitle: "PocketFleet Bridge 패널 펼치기",
    panelChecking: "로컬 브리지 확인 중...",
    panelConnected: "제어 링크 온라인 — 협업 브리지 준비 완료",
    panelPaused: "제어 링크 온라인 — 도구 실행 일시중지",
    panelVersionMismatch: "제어 링크 온라인 — 도구 실행 가능 | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "미연결: ",
    panelBridgeOffline: '로컬 브리지가 실행되지 않습니다 (Port 18765 오프라인 — 제어 패널에서 "3. Web Extension Bridge"를 시작하세요)',
    panelNoActivity: "도구 활동이 아직 없습니다",
    panelAdapterInjectedQwen: "Qwen 어댑터 주입됨 — 새 액션 매크로 없음",
    panelAdapterInjectedDoubao: "Doubao 어댑터 주입됨 — 회의 메일 대기 중",
    panelPausing: "일시중지 중...",
    panelResuming: "재개 중...",
    panelPausedDone: "실행이 일시중지되었습니다",
    panelResumedDone: "실행이 재개되었습니다",
    panelControlFailed: "제어 실패: ",
    panelReinjecting: "AI에 메시지 규약 재전송 중...",
    panelReinjected: '규약을 AI에 재전송했습니다 — "규약 로드됨" 응답 대기 중',
    panelGuardBlocked: "제어 링크가 일시중지이거나 알 수 없음 — 도구 실행 거부",
    panelGuardAbort: "제어 링크가 일시중지이거나 알 수 없음 — 도구 결과 제출 중단",
    panelRejectMultiTool: "거부: bridge 메시지 하나에는 도구 호출 하나만 포함할 수 있습니다",
    panelNoEditor: "입력 상자를 찾을 수 없음 — 페이지 어댑터 업데이트 필요",
    panelEditorBusy: "입력 상자가 비어 있지 않음 — 자동 가져오기 일시중지",
  },
  fr: {
    panelCollapse: "Réduire",
    panelCollapseTitle: "Réduire le panneau flottant",
    panelRecentActivity: "Activité récente",
    panelPause: "Pause",
    panelResume: "Reprendre",
    panelInstructions: "Convention",
    panelRecheck: "Revérifier",
    panelRetry: "Réessayer",
    panelCollapsedLabel: "PF Bridge",
    panelExpandTitle: "Déployer le panneau PocketFleet Bridge",
    panelChecking: "Vérification du pont local...",
    panelConnected: "Lien de contrôle en ligne — pont de collaboration prêt",
    panelPaused: "Lien de contrôle en ligne — exécution des outils en pause",
    panelVersionMismatch: "Lien de contrôle en ligne — outils autorisés | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "Non connecté : ",
    panelBridgeOffline: "Pont local non démarré (port 18765 hors ligne — démarrez « 3. Web Extension Bridge » dans le panneau de configuration)",
    panelNoActivity: "Aucune activité d'outil pour l'instant",
    panelAdapterInjectedQwen: "Adaptateur Qwen injecté — aucune nouvelle macro d'action",
    panelAdapterInjectedDoubao: "Adaptateur Doubao injecté — en attente du courrier de réunion",
    panelPausing: "Mise en pause...",
    panelResuming: "Reprise en cours...",
    panelPausedDone: "Exécution en pause",
    panelResumedDone: "Exécution reprise",
    panelControlFailed: "Échec du contrôle : ",
    panelReinjecting: "Renvoi de la convention de messagerie à l'IA...",
    panelReinjected: "Convention renvoyée à l'IA — en attente de la réponse « convention chargée »",
    panelGuardBlocked: "Lien de contrôle en pause ou inconnu — exécution d'outil refusée",
    panelGuardAbort: "Lien de contrôle en pause ou inconnu — soumission du résultat d'outil abandonnée",
    panelRejectMultiTool: "Refusé : un message bridge ne peut contenir qu'un seul appel d'outil",
    panelNoEditor: "Zone de saisie introuvable — l'adaptateur de page doit être mis à jour",
    panelEditorBusy: "Zone de saisie non vide — récupération automatique en pause",
  },
  de: {
    panelCollapse: "Einklappen",
    panelCollapseTitle: "Schwebendes Panel einklappen",
    panelRecentActivity: "Letzte Aktivität",
    panelPause: "Pausieren",
    panelResume: "Fortsetzen",
    panelInstructions: "Konvention",
    panelRecheck: "Erneut prüfen",
    panelRetry: "Erneut senden",
    panelCollapsedLabel: "PF Bridge",
    panelExpandTitle: "PocketFleet-Bridge-Panel ausklappen",
    panelChecking: "Lokale Bridge wird geprüft...",
    panelConnected: "Steuerverbindung online — Zusammenarbeits-Bridge bereit",
    panelPaused: "Steuerverbindung online — Tool-Ausführung pausiert",
    panelVersionMismatch: "Steuerverbindung online — Tools dürfen laufen | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "Nicht verbunden: ",
    panelBridgeOffline: "Lokale Bridge läuft nicht (Port 18765 offline — starten Sie „3. Web Extension Bridge“ im Bedienfeld)",
    panelNoActivity: "Noch keine Tool-Aktivität",
    panelAdapterInjectedQwen: "Qwen-Adapter injiziert — noch kein neues Aktions-Makro",
    panelAdapterInjectedDoubao: "Doubao-Adapter injiziert — warte auf Besprechungs-E-Mail",
    panelPausing: "Wird pausiert...",
    panelResuming: "Wird fortgesetzt...",
    panelPausedDone: "Ausführung pausiert",
    panelResumedDone: "Ausführung fortgesetzt",
    panelControlFailed: "Steuerung fehlgeschlagen: ",
    panelReinjecting: "Konvention wird erneut an die KI gesendet...",
    panelReinjected: "Konvention erneut an die KI gesendet — warte auf die Antwort „Konvention geladen“",
    panelGuardBlocked: "Steuerverbindung pausiert oder unbekannt — Tool-Ausführung verweigert",
    panelGuardAbort: "Steuerverbindung pausiert oder unbekannt — Tool-Ergebnis-Übermittlung abgebrochen",
    panelRejectMultiTool: "Abgelehnt: eine Bridge-Nachricht darf nur einen Tool-Aufruf enthalten",
    panelNoEditor: "Eingabefeld nicht gefunden — der Seitenadapter benötigt ein Update",
    panelEditorBusy: "Eingabefeld nicht leer — automatisches Abrufen pausiert",
  },
  es: {
    panelCollapse: "Contraer",
    panelCollapseTitle: "Contraer el panel flotante",
    panelRecentActivity: "Actividad reciente",
    panelPause: "Pausar",
    panelResume: "Reanudar",
    panelInstructions: "Convención",
    panelRecheck: "Volver a comprobar",
    panelRetry: "Reintentar",
    panelCollapsedLabel: "PF Bridge",
    panelExpandTitle: "Expandir el panel de PocketFleet Bridge",
    panelChecking: "Comprobando el puente local...",
    panelConnected: "Enlace de control en línea — puente de colaboración listo",
    panelPaused: "Enlace de control en línea — ejecución de herramientas pausada",
    panelVersionMismatch: "Enlace de control en línea — las herramientas pueden ejecutarse | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "No conectado: ",
    panelBridgeOffline: 'El puente local no está en ejecución (puerto 18765 sin conexión — inicia "3. Web Extension Bridge" en el panel de control)',
    panelNoActivity: "Sin actividad de herramientas aún",
    panelAdapterInjectedQwen: "Adaptador Qwen inyectado — sin nueva macro de acciones",
    panelAdapterInjectedDoubao: "Adaptador Doubao inyectado — esperando el correo de la reunión",
    panelPausing: "Pausando...",
    panelResuming: "Reanudando...",
    panelPausedDone: "Ejecución pausada",
    panelResumedDone: "Ejecución reanudada",
    panelControlFailed: "Error de control: ",
    panelReinjecting: "Reenviando la convención de mensajería a la IA...",
    panelReinjected: "Convención reenviada a la IA — esperando la respuesta «convención cargada»",
    panelGuardBlocked: "Enlace de control pausado o desconocido — ejecución de herramientas rechazada",
    panelGuardAbort: "Enlace de control pausado o desconocido — envío del resultado de herramienta abortado",
    panelRejectMultiTool: "Rechazado: un mensaje bridge solo puede contener una llamada de herramienta",
    panelNoEditor: "Cuadro de entrada no encontrado — el adaptador de página necesita una actualización",
    panelEditorBusy: "Cuadro de entrada no vacío — recuperación automática pausada",
  },
  pt: {
    panelCollapse: "Recolher",
    panelCollapseTitle: "Recolher o painel flutuante",
    panelRecentActivity: "Atividade recente",
    panelPause: "Pausar",
    panelResume: "Retomar",
    panelInstructions: "Convenção",
    panelRecheck: "Verificar novamente",
    panelRetry: "Reenviar",
    panelCollapsedLabel: "PF Bridge",
    panelExpandTitle: "Expandir o painel PocketFleet Bridge",
    panelChecking: "Verificando a ponte local...",
    panelConnected: "Ligação de controle online — ponte de colaboração pronta",
    panelPaused: "Ligação de controle online — execução de ferramentas pausada",
    panelVersionMismatch: "Ligação de controle online — ferramentas podem executar | VERSION_MISMATCH / RESTART_REQUIRED",
    panelDisconnected: "Não conectado: ",
    panelBridgeOffline: 'A ponte local não está em execução (porta 18765 offline — inicie "3. Web Extension Bridge" no painel de controle)',
    panelNoActivity: "Nenhuma atividade de ferramentas ainda",
    panelAdapterInjectedQwen: "Adaptador Qwen injetado — nenhuma nova macro de ação",
    panelAdapterInjectedDoubao: "Adaptador Doubao injetado — aguardando e-mail da reunião",
    panelPausing: "Pausando...",
    panelResuming: "Retomando...",
    panelPausedDone: "Execução pausada",
    panelResumedDone: "Execução retomada",
    panelControlFailed: "Falha no controle: ",
    panelReinjecting: "Reenviando a convenção de mensagens para a IA...",
    panelReinjected: "Convenção reenviada para a IA — aguardando a resposta «convenção carregada»",
    panelGuardBlocked: "Ligação de controle pausada ou desconhecida — execução de ferramenta recusada",
    panelGuardAbort: "Ligação de controle pausada ou desconhecida — envio do resultado da ferramenta abortado",
    panelRejectMultiTool: "Rejeitado: uma mensagem bridge pode conter apenas uma chamada de ferramenta",
    panelNoEditor: "Caixa de entrada não encontrada — o adaptador de página precisa de atualização",
    panelEditorBusy: "Caixa de entrada não vazia — recuperação automática pausada",
  },
};
const PANEL_I18N_FALLBACK = "en";
let panelMessages = PANEL_I18N[PANEL_I18N_FALLBACK];
/** 文案取值：当前语言表 → en 兜底 → key 本身（绝不抛错，绝不显示空白）。 */
function panelT(key) {
  const table = panelMessages || PANEL_I18N[PANEL_I18N_FALLBACK];
  return table[key] ?? PANEL_I18N[PANEL_I18N_FALLBACK][key] ?? key;
}
function defaultActivityMessage() {
  if (isQwen) return panelT("panelAdapterInjectedQwen");
  if (isDoubao) return panelT("panelAdapterInjectedDoubao");
  return panelT("panelNoActivity");
}
let activityIsIdle = true;
let connectionKey = "panelChecking";
let connectionDetail = "";
let connectionState = "checking";
let activityMessage = defaultActivityMessage();
let activityWarning = false;'''

I18N_BLOCK = PANEL_I18N_JS

STATE_ANCHOR = '''let connectionMessage = "正在检测本地桥...";
let connectionState = "checking";
let activityMessage = isQwen
  ? "Qwen 适配器已注入，未检测到新行动宏"
  : isDoubao
    ? "豆包适配器已注入，等待会议来信"
    : "尚无工具活动";
let activityWarning = false;'''

EDITS = [
    # ① 模块状态：中文硬编码 → i18n 表 + 键式连接态 + 空闲标志
    (STATE_ANCHOR, I18N_BLOCK, 1),

    # ② setConnection → setConnectionKey + connectionText
    ('''function setConnection(message, state = "checking") {
  connectionMessage = message;
  connectionState = state;
  renderStatus();
}''',
     '''/** 连接态改用「键 + 明细」存储：语言切换后重渲自动换语（字符串存了就越描越漂）。 */
function setConnectionKey(key, state = "checking", detail = "") {
  connectionKey = key;
  connectionDetail = detail || "";
  connectionState = state;
  renderStatus();
}
function connectionText() {
  const base = panelT(connectionKey);
  return connectionDetail ? base + connectionDetail : base;
}''', 1),

    # ③ setActivity：记录「已非空闲」
    ('''function setActivity(message, { warning = false } = {}) {
  activityMessage = warning ? `⚠ ${message}` : message;''',
     '''function setActivity(message, { warning = false } = {}) {
  activityIsIdle = false;
  activityMessage = warning ? `⚠ ${message}` : message;''', 1),

    # ④ renderStatus：签名换键、连接文案走 connectionText、主按钮标签走 panelT
    ('''  const renderSignature = JSON.stringify({
    connectionState,
    connectionMessage,
    activityMessage,''',
     '''  const renderSignature = JSON.stringify({
    connectionState,
    connectionKey,
    connectionDetail,
    activityMessage,''', 1),
    ('  if (conn) conn.textContent = connectionMessage;',
     '  if (conn) conn.textContent = connectionText();', 1),
    ('    controlLabel.textContent = killSwitchActive ? "恢复执行" : "暂停执行";',
     '    controlLabel.textContent = panelT(killSwitchActive ? "panelResume" : "panelPause");', 1),

    # ⑤ refreshStatus：四个连接态全部换键
    ('  setConnection("正在检测本地桥...", "checking");',
     '  setConnectionKey("panelChecking", "checking");', 1),
    ('''    if (current.kill_switch_active) {
      setConnection("控制链在线，工具执行已暂停", "warning");
    } else {
      setConnection("控制链在线，协同网桥已就绪", "connected");
    }''',
     '''    if (current.kill_switch_active) {
      setConnectionKey("panelPaused", "warning");
    } else {
      setConnectionKey("panelConnected", "connected");
    }''', 1),
    ('''    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = "本地网桥未启动 (Port 18765 离线，请在控制面板启动 3. Web Extension Bridge)";
    }
    setConnection(`未连接：${msg}`, "disconnected");''',
     '''    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = panelT("panelBridgeOffline");
    }
    setConnectionKey("panelDisconnected", "disconnected", msg);''', 1),

    # ⑥ toggleExecution：三态反馈换键
    ('  setActivity(action === "pause" ? "正在暂停执行..." : "正在恢复执行...");',
     '  setActivity(panelT(action === "pause" ? "panelPausing" : "panelResuming"));', 1),
    ('    setActivity(action === "pause" ? "执行已暂停" : "执行已恢复");',
     '    setActivity(panelT(action === "pause" ? "panelPausedDone" : "panelResumedDone"));', 1),
    ('    setActivity(`控制失败：${error.message}`);',
     '    setActivity(panelT("panelControlFailed") + error.message);', 1),

    # ⑦ handleInstructionsClick：重申规范两态换键
    ('    setActivity("正在向 AI 重申发信规范...");',
     '    setActivity(panelT("panelReinjecting"));', 1),
    ('    setActivity("已向 AI 重申发信规范，等待「发信规范已加载」回复");',
     '    setActivity(panelT("panelReinjected"));', 1),

    # ⑧ 守卫与拒绝换键
    ('    setActivity("控制链已暂停或状态未知，拒绝执行工具");',
     '    setActivity(panelT("panelGuardBlocked"));', 1),
    ('    throw new Error("控制链已暂停或状态未知，中止工具结果提交");',
     '    throw new Error(panelT("panelGuardAbort"));', 1),
    ('      setActivity("已拒绝：一条 bridge 消息只能包含一个工具调用");',
     '      setActivity(panelT("panelRejectMultiTool"));', 1),
    ('    setActivity("未找到输入框，页面适配器需要更新", true);',
     '    setActivity(panelT("panelNoEditor"), true);', 1),
    ('      setActivity("输入框非空，已暂停自动拉取");',
     '      setActivity(panelT("panelEditorBusy"));', 1),

    # ⑨ 三处「中文串比对」改为空闲/警告标志（中文字面量比对在换语后必然失效）
    ('    if (activityMessage === "尚无工具活动" || activityMessage.includes("未找到输入框")) {',
     '    if (activityIsIdle || activityWarning) {', 1),
    ('    if (activityMessage === "尚无工具活动" || activityMessage.includes("输入框非空")) {',
     '    if (activityIsIdle || activityWarning) {', 1),
    ('    if (!activeMacroObserved && activityMessage === "尚无工具活动") {',
     '    if (!activeMacroObserved && activityIsIdle) {', 1),
    ('      setActivity("Qwen 适配器已注入，未检测到新行动宏");',
     '      setActivity(panelT("panelAdapterInjectedQwen"));', 1),

    # ⑩ VERSION_MISMATCH 四处（同文重复但缩进不同：8/10/6/6 空格；
    #    锚点带前导 \n 防「10 空格行包含 8 空格锚点」的子串陷阱）
    ('\n        setConnection("控制链在线，工具可以执行 | VERSION_MISMATCH / RESTART_REQUIRED", "warning");',
     '\n        setConnectionKey("panelVersionMismatch", "warning");', 1),
    ('\n          setConnection("控制链在线，工具可以执行 | VERSION_MISMATCH / RESTART_REQUIRED", "warning");',
     '\n          setConnectionKey("panelVersionMismatch", "warning");', 1),
    ('\n      setConnection("控制链在线，工具可以执行 | VERSION_MISMATCH / RESTART_REQUIRED", "warning");',
     '\n      setConnectionKey("panelVersionMismatch", "warning");', 2),

    # ⑪ 模板：静态文本 data-i18n 化（缺省英语＝产品默认语言）
    ('data-action="collapse" title="收起浮层" aria-label="收起浮层">',
     'data-action="collapse" data-i18n-title="panelCollapseTitle" title="Collapse the floating panel" aria-label="Collapse the floating panel">', 1),
    ('<polyline points="6 14 12 8 18 14"></polyline></svg>\n        收起\n',
     '<polyline points="6 14 12 8 18 14"></polyline></svg>\n        <span data-i18n="panelCollapse">Collapse</span>\n', 1),
    ('<path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"></path></svg>最近动作</span>',
     '<path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z"></path></svg><span data-i18n="panelRecentActivity">Recent activity</span></span>', 1),
    ('          <span data-control-label>暂停执行</span>',
     '          <span data-control-label>Pause</span>', 1),
    ('<line x1="16" y1="17" x2="8" y2="17"></line></svg>\n          协同说明\n',
     '<line x1="16" y1="17" x2="8" y2="17"></line></svg>\n          <span data-i18n="panelInstructions">Convention</span>\n', 1),
    ('<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>\n          重新检测\n',
     '<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>\n          <span data-i18n="panelRecheck">Recheck</span>\n', 1),
    ('<path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>\n          重试回传\n',
     '<path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>\n          <span data-i18n="panelRetry">Retry</span>\n', 1),
    ('data-action="expand" title="展开 PocketFleet Bridge 浮层">',
     'data-action="expand" data-i18n-title="panelExpandTitle" title="Expand the PocketFleet Bridge panel">', 1),
    ('<span class="bridge-collapsed-label">PF 桥</span>',
     '<span class="bridge-collapsed-label" data-i18n="panelCollapsedLabel">PF Bridge</span>', 1),

    # ⑫ applyPanelI18n + loadPanelLocale（插在 panel() 之后）
    ('''  renderStatus(root);
  return root;
}

function renderStatus(root = null) {''',
     '''  renderStatus(root);
  return root;
}

/** 把当前语言表应用到已渲染面板：静态 data-i18n 节点 + 强制重渲动态字段。 */
function applyPanelI18n(root) {
  if (!root) return;
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = panelT(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const text = panelT(node.dataset.i18nTitle);
    node.title = text;
    if (node.hasAttribute("aria-label")) node.setAttribute("aria-label", text);
  });
}

/** 按语言偏好整体换语：pf_ui_locale（popup 语言菜单同一键）→ 缺省英语。 */
function applyPanelLocale(value) {
  const locale = PANEL_I18N[value] ? value : PANEL_I18N_FALLBACK;
  panelMessages = PANEL_I18N[locale];
  if (activityIsIdle) activityMessage = defaultActivityMessage();
  const root = typeof document !== "undefined" && document.getElementById(PANEL_ID);
  if (root) {
    applyPanelI18n(root);
    delete root.dataset.renderSignature; // 强制重渲：连接态/主按钮标签随语言表换语
    renderStatus(root);
  }
}

/** 启动时解析一次语言偏好。storage 回调真机为一次 IPC（亚毫秒~毫秒级），
 *  期间面板以缺省英语呈现，回来后整体换语；panel() 建面板时也会立即应用当前表。 */
function loadPanelLocale() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
      chrome.storage.local.get({ [LANG_PREF_KEY]: "" }, (res) => {
        applyPanelLocale((res && res[LANG_PREF_KEY]) || "");
      });
      return;
    }
  } catch {}
  applyPanelLocale("");
}

function renderStatus(root = null) {''', 1),

    # ⑬ panel() 建面板即应用当前语言表
    ('''      }
    } catch {}
  }
  if (newlyCreated || !panelClaimed || root.dataset.bridgeOwner !== CONTENT_INSTANCE_ID) {''',
     '''      }
    } catch {}
    applyPanelI18n(root);
  }
  if (newlyCreated || !panelClaimed || root.dataset.bridgeOwner !== CONTENT_INSTANCE_ID) {''', 1),

    # ⑭ bootstrap：先发语言解析再建面板 + 监听 popup 侧语言变更（实时跟随）
    ('''  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  panel();
  refreshStatus();''',
     '''  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  loadPanelLocale(); // 先发后至：面板先以缺省英语渲染，IPC 回来整体换语
  panel();
  refreshStatus();''', 1),
]

# storage 监听单独追加（插在 loadPanelLocale 定义之后）
LISTENER_EDIT = (
    '''function renderStatus(root = null) {''',
    '''/** popup 里改语言 → 已打开页面的浮层实时跟随（测试桩无 onChanged，守卫跳过）。 */
try {
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[LANG_PREF_KEY]) {
        applyPanelLocale(changes[LANG_PREF_KEY].newValue || "");
      }
    });
  }
} catch {}

function renderStatus(root = null) {''',
    1,
)


def main():
    with open(JS, "r", encoding="utf-8", newline="") as f:
        raw = f.read()
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    for old, new, expect in EDITS + [LISTENER_EDIT]:
        n = text.count(old)
        if n != expect:
            print("[FAIL] anchor count=%d (expect %d):\n%s" % (n, expect, old[:200]))
            sys.exit(1)
        text = text.replace(old, new)

    # 旧值清零断言（只查「表外不应存在」的形态；语言表内的中文文案合法保留）
    for gone in (
        'setConnection("',
        "connectionMessage",
        'title="收起浮层"',
        'aria-label="收起浮层"',
        'title="展开',
        "PF 桥</span>",
        "data-control-label>暂停执行",
        "最近动作</span>",
        '"恢复执行" : "暂停执行"',
        "重新检测\n",
        "重试回传\n",
        "协同说明\n",
    ):
        if gone in text:
            print("[FAIL] stale value remains: %r" % gone)
            sys.exit(1)
    # 新标识符就位断言
    for want in (
        "PANEL_I18N", "panelT(", "applyPanelI18n", "loadPanelLocale", "applyPanelLocale",
        "setConnectionKey(", "connectionText()", "activityIsIdle", "data-i18n=",
        "storage.onChanged",
    ):
        if want not in text:
            print("[FAIL] missing: %r" % want)
            sys.exit(1)

    out = text.replace("\n", "\r\n") if crlf else text
    with open(JS, "w", encoding="utf-8", newline="") as f:
        f.write(out)
    print("[OK] content.js patched: panel i18n (31 keys x 8 locales, %d edits)" % (len(EDITS) + 1))


if __name__ == "__main__":
    main()
