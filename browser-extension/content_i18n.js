// @content-section i18n-catalog
/* ---------- 面板 i18n（内联 8 语言表 · 沿用 launch.js 模式） ----------
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
    panelMeetingDivider: "————— 会议启动分割线 —————",
    panelDraftAppended: "已保留原有输入内容并追加启动会议: ",
    panelMeetingDraftUpdated: "正在更新为最新会议任务书: ",
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
    panelMeetingDivider: "————— Meeting Launch Divider —————",
    panelDraftAppended: "Preserved draft & appended meeting prompt: ",
    panelMeetingDraftUpdated: "Updating to latest meeting task briefing: ",
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
    panelMeetingDivider: "————— 会議開始の区切り線 —————",
    panelDraftAppended: "下書きを保持し、会議プロンプトを追加しました: ",
    panelMeetingDraftUpdated: "最新の会議タスク指示書に更新中: ",
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
    panelMeetingDivider: "————— 회의 시작 구분선 —————",
    panelDraftAppended: "작성 중인 내용을 보존하고 회의 프롬프트를 추가했습니다: ",
    panelMeetingDraftUpdated: "최신 회의 작업 지침서로 업데이트 중: ",
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
    panelMeetingDivider: "————— Ligne de division de lancement de réunion —————",
    panelDraftAppended: "Brouillon conservé et invite de réunion ajoutée : ",
    panelMeetingDraftUpdated: "Mise à jour vers le dernier briefing de réunion : ",
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
    panelMeetingDivider: "————— Besprechungsstart-Trennlinie —————",
    panelDraftAppended: "Entwurf beibehalten & Besprechungsprompt angehängt: ",
    panelMeetingDraftUpdated: "Aktualisierung auf aktuelles Besprechungsbriefing: ",
  },
  es: {
    panelCollapse: "Contraer",
    panelCollapseTitle: "Contraer el panel flotante",
    panelRecentActivity: "Actividad reciente",
    panelPause: "Pausar",
    panelResume: "Reanudar",
    panelInstructions: "Convención",
    panelRecheck: "Revisar",
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
    panelMeetingDivider: "————— Línea divisoria de inicio de reunión —————",
    panelDraftAppended: "Borrador conservado y aviso de reunión añadido: ",
    panelMeetingDraftUpdated: "Actualizando al último informe de la reunión: ",
  },
  pt: {
    panelCollapse: "Recolher",
    panelCollapseTitle: "Recolher o painel flutuante",
    panelRecentActivity: "Atividade recente",
    panelPause: "Pausar",
    panelResume: "Retomar",
    panelInstructions: "Convenção",
    panelRecheck: "Verificar",
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
    panelMeetingDivider: "————— Linha divisória de início de reunião —————",
    panelDraftAppended: "Rascunho preservado e prompt de reunião anexado: ",
    panelMeetingDraftUpdated: "Atualizando para o briefing de reunião mais recente: ",
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
// @content-section i18n-render
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

/** popup 里改语言 → 已打开页面的浮层实时跟随（测试桩无 onChanged，守卫跳过）。 */
try {
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[LANG_PREF_KEY]) {
        applyPanelLocale(changes[LANG_PREF_KEY].newValue || "");
      }
    });
  }
} catch {}

