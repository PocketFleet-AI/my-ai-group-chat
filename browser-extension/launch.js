// launch.js - PocketFleet Launch Pad Page Controller (MV3 Compliant, No Inline Script)
// 游隼 2026-12 接手 UI：只做呈现层增强，不改探活/唤起链路。
// 约法三章：①本文件保持独立外链 ②核心 ID #btnRetryLaunch #btnCloseTab #statusBadge #statusText 均已保留

const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const subTitleText = document.getElementById("subTitleText");
const tipBox = document.getElementById("tipBox");
const tipText = document.getElementById("tipText");
const launchCard = document.getElementById("launchCard");
const progressBar = document.getElementById("progressBar");
const headline = document.getElementById("headline");
const btnRetry = document.getElementById("btnRetryLaunch");
const btnRetryLabel = document.getElementById("btnRetryLabel");
const footText = document.getElementById("footText");

let isConnected = false;
let pollCount = 0;

/* ------------------------------------------------------------------
   文案表：接力页是独立文档，拿不到扩展页的 chrome.i18n，
   故自带文案。八国语言在此登记，key 与 _locales 保持同名以便同步。
   ------------------------------------------------------------------ */
const T = {
  zh_CN: {
    headlineWait: "启动 PocketFleet",
    subtitleWait: "通过系统协议调用桌面客户端……",
    waiting: "等待客户端响应 (18765)…",
    retrying: "正在呼叫客户端…",
    notYet: "尚未检测到客户端——点击重新启动",
    stillNot: "客户端仍未响应。如果应用程序未运行，请手动打开 PocketFleet。",
    success: "PocketFleet 窗口已成功在前台呼出！",
    successSub: "客户端已就绪，此页面将自动关闭…",
    tipScheme: '如果应用程序未运行，<b>请手动打开 PocketFleet</b>。',
    tipStuck: '如果应用程序未运行，<b>请手动打开 PocketFleet</b>。',
    footWait: "客户端准备就绪后，此页面将自动关闭。",
    footOk: "即将关闭此页面…",
    retry: "重新启动",
    close: "关闭此页面",
    downloadPrefix: "尚未安装客户端？",
    downloadLink: "前往 pocketfleet.data-records.net 下载桌面端 →",
  },
  ja: {
    headlineWait: "PocketFleet を起動しています",
    subtitleWait: "システムプロトコルでデスクトップクライアントを呼び出しています…",
    waiting: "クライアントの応答を待っています (18765)…",
    retrying: "クライアントを呼び出しています…",
    notYet: "クライアントを検出できません。「再起動」をクリックしてください",
    stillNot: "クライアントから応答がありません。アプリが起動していない場合は、PocketFleet を手動で開いてください。",
    success: "PocketFleet ウィンドウを前面に表示しました！",
    successSub: "クライアントの準備ができました。このページはまもなく閉じます…",
    tipScheme: 'ブラウザの確認ダイアログが出たら、<b>「常に許可」</b>にチェックして<b>「PocketFleet を開く」</b>をクリックしてください。次回からワンクリックで起動できます。',
    tipStuck: 'アプリが起動していない場合は <b>PocketFleet を手動で開いてください</b>。未処理のブラウザの確認が残っていないか確認してください。',
    footWait: "クライアントの準備ができたら、このページは自動的に閉じます",
    footOk: "まもなくこのページを閉じます…",
    retry: "再起動",
    close: "このページを閉じる",
  },
  ko: {
    headlineWait: "PocketFleet 시작 중",
    subtitleWait: "시스템 프로토콜로 데스크톱 클라이언트를 호출하는 중…",
    waiting: "클라이언트 응답을 기다리는 중 (18765)…",
    retrying: "클라이언트를 호출하는 중…",
    notYet: "클라이언트를 찾지 못했습니다. 「다시 시작」을 클릭하세요",
    stillNot: "클라이언트가 여전히 응답하지 않습니다. 앱이 실행 중이 아니라면 PocketFleet를 직접 열어 주세요.",
    success: "PocketFleet 창을 앞으로 불러왔습니다!",
    successSub: "클라이언트가 준비되었습니다. 이 곧이 닫힙니다…",
    tipScheme: '브라우저 확인 창이 나타나면 <b>“항상 허용”</b>을 체크하고 <b>“PocketFleet 열기”</b>를 클릭하세요. 이후에는 한 번의 클릭으로 실행됩니다.',
    tipStuck: '앱이 실행 중이 아니라면 <b>PocketFleet를 직접 열어 주세요</b> 또는 처리되지 않은 브라우저 확인 창이 있는지 확인하세요.',
    footWait: "클라이언트 준비가 완료되면 이 페이지가 자동으로 닫힙니다",
    footOk: "곧 이 페이지를 닫습니다…",
    retry: "다시 시작",
    close: "이 페이지 닫기",
  },
  fr: {
    headlineWait: "Démarrage de PocketFleet",
    subtitleWait: "Appel du client de bureau via le protocole système…",
    waiting: "En attente du client (18765)…",
    retrying: "Appel du client…",
    notYet: "Client introuvable — cliquez sur Relancer",
    stillNot: "Toujours aucune réponse. Si l'application n'est pas lancée, ouvrez PocketFleet manuellement.",
    success: "La fenêtre PocketFleet est au premier plan !",
    successSub: "Le client est prêt — cette page va se fermer…",
    tipScheme: 'Si le navigateur vous le demande, cochez <b>« Toujours autoriser »</b> puis choisissez <b>« Ouvrir PocketFleet »</b> pour lancer en un clic.',
    tipStuck: "Si l'application n'est pas lancée, <b>ouvrez PocketFleet manuellement</b> ou vérifiez si une confirmation du navigateur est encore en attente.",
    footWait: "Cette page se ferme automatiquement dès que le client est prêt",
    footOk: "Fermeture de cette page…",
    retry: "Relancer",
    close: "Fermer cette page",
  },
  de: {
    headlineWait: "PocketFleet wird gestartet",
    subtitleWait: "Desktop-Client wird über das Systemprotokoll aufgerufen…",
    waiting: "Warte auf den Client (18765)…",
    retrying: "Client wird aufgerufen…",
    notYet: "Client nicht erkannt — auf „Neu starten“ klicken",
    stillNot: "Noch keine Antwort. Falls die App nicht läuft, öffne PocketFleet manuell.",
    success: "Das PocketFleet-Fenster ist jetzt im Vordergrund!",
    successSub: "Client ist bereit — diese Seite schließt gleich…",
    tipScheme: 'Wenn der Browser nachfragt, aktiviere <b>„Immer zulassen“</b> und wähle <b>„PocketFleet öffnen“</b> — danach startet es mit einem Klick.',
    tipStuck: 'Falls die App nicht läuft, <b>öffne PocketFleet manuell</b> oder prüfe, ob noch eine Browser-Bestätigung offen ist.',
    footWait: "Diese Seite schließt automatisch, sobald der Client bereit ist",
    footOk: "Diese Seite wird geschlossen…",
    retry: "Neu starten",
    close: "Diese Seite schließen",
  },
  es: {
    headlineWait: "Iniciando PocketFleet",
    subtitleWait: "Llamando al cliente de escritorio mediante el protocolo del sistema…",
    waiting: "Esperando al cliente (18765)…",
    retrying: "Llamando al cliente…",
    notYet: "Cliente no detectado: haz clic en «Relanzar»",
    stillNot: "Sigue sin respuesta. Si la aplicación no está en ejecución, abre PocketFleet manualmente.",
    success: "¡La ventana de PocketFleet está en primer plano!",
    successSub: "El cliente está listo; esta página se cerrará en breve…",
    tipScheme: 'Si el navegador lo pregunta, marca <b>«Permitir siempre»</b> y elige <b>«Abrir PocketFleet»</b> para iniciarlo con un solo clic.',
    tipStuck: 'Si la aplicación no está en ejecución, <b>abre PocketFleet manualmente</b> o comprueba si queda alguna confirmación del navegador pendiente.',
    footWait: "Esta página se cierra automáticamente cuando el cliente esté listo",
    footOk: "Cerrando esta página…",
    retry: "Relanzar",
    close: "Cerrar esta página",
  },
  pt: {
    headlineWait: "A iniciar o PocketFleet",
    subtitleWait: "A chamar o cliente de ambiente de trabalho através do protocolo do sistema…",
    waiting: "À espera do cliente (18765)…",
    retrying: "A chamar o cliente…",
    notYet: "Cliente não detetado — clique em «Relançar»",
    stillNot: "Ainda sem resposta. Se a aplicação não estiver em execução, abra o PocketFleet manualmente.",
    success: "A janela do PocketFleet está em primeiro plano!",
    successSub: "O cliente está pronto — esta página fechará em breve…",
    tipScheme: 'Se o navegador perguntar, marque <b>«Permitir sempre»</b> e escolha <b>«Abrir o PocketFleet»</b> para lançar com um clique.',
    tipStuck: 'Se a aplicação não estiver em execução, <b>abra o PocketFleet manualmente</b> ou verifique se ainda há alguma confirmação do navegador pendente.',
    footWait: "Esta página fecha automaticamente assim que o cliente estiver pronto",
    footOk: "A fechar esta página…",
    retry: "Relançar",
    close: "Fechar esta página",
  },
  en: {
    headlineWait: "Starting PocketFleet",
    subtitleWait: "Calling the desktop client via the system protocol…",
    waiting: "Waiting for the client (18765)…",
    retrying: "Calling the client…",
    notYet: "Client not detected yet — click Re-launch",
    stillNot: "Still no response. If the app is not running, open PocketFleet manually.",
    success: "PocketFleet is now in the foreground!",
    successSub: "Client is ready — this page will close shortly…",
    tipScheme: 'If the browser asks, tick <b>“Always allow”</b> and choose <b>“Open PocketFleet”</b> to launch in one click from now on.',
    tipStuck: 'If the app is not running, <b>open PocketFleet manually</b> or check for a browser confirmation still pending.',
    footWait: "This page closes automatically once the client is ready",
    footOk: "Closing this page…",
    retry: "Re-launch",
    close: "Close this page",
    downloadPrefix: "Haven't installed the desktop app yet? ",
    downloadLink: "Download desktop app at pocketfleet.data-records.net →",
  },
};

const SUPPORTED = ["zh_CN", "en", "ja", "ko", "fr", "de", "es", "pt"];
// 偏好键必须与 popup.js:48 的 LANG_PREF_KEY 一致，否则用户选的语言传不到接力页。
const LANG_PREF_KEY = "pf_ui_locale";

/** BCP-47 收敛：精确匹配 → 去掉区域后缀 → 回退en。 */
function resolveLocale(raw) {
  const tag = String(raw || "").replace("_", "-").toLowerCase();
  if (!tag) return "en";
  const exact = SUPPORTED.find((l) => l.toLowerCase() === tag);
  if (exact) return exact;
  const primary = tag.split("-")[0];
  return SUPPORTED.find((l) => l.toLowerCase().split("_")[0] === primary) || "en";
}

/** 语言来源：用户显式选择 > 扩展 UI 语言 > 浏览器语言。 */
async function detectLocale() {
  try {
    const stored = await chrome.storage.local.get(LANG_PREF_KEY);
    if (stored && stored[LANG_PREF_KEY]) return resolveLocale(stored[LANG_PREF_KEY]);
  } catch (e) {}
  try {
    if (chrome.i18n && chrome.i18n.getUILanguage) {
      const ui = chrome.i18n.getUILanguage();
      if (ui) return resolveLocale(ui);
    }
  } catch (e) {}
  return resolveLocale(navigator.language);
}

let LANG = "en";
function t(key) { return (T[LANG] || T.en)[key] || (T.en[key] || ""); }

/** 把静态文案刷新为当前语言（状态文案由各流程自己调 t() 输出）。 */
function applyStaticI18n() {
  if (document.documentElement) document.documentElement.lang = LANG.replace("_", "-");
  if (headline) headline.textContent = t("headlineWait");
  if (subTitleText) subTitleText.textContent = t("subtitleWait");
  if (btnRetryLabel) btnRetryLabel.textContent = t("retry");
  if (btnClose) btnClose.textContent = t("close");
  if (footText) footText.textContent = t("footWait");
  if (statusText) statusText.textContent = t("waiting");
  const pEl = document.getElementById("downloadPrefix");
  const lEl = document.getElementById("downloadLink");
  if (pEl) pEl.textContent = t("downloadPrefix") || "Haven't installed the desktop app yet? ";
  if (lEl) lEl.textContent = t("downloadLink") || "Download desktop app at pocketfleet.data-records.net →";
  setTip(t("tipScheme"));
}

/* ---------------- 呈现层 ---------------- */

/** 设置进度条百分比（不封顶 92%，永远留「还没成」的余量）。 */
function setProgress(percent) {
  if (progressBar && launchCard.dataset.phase !== "ok") {
    progressBar.style.width = Math.min(92, Math.max(0, percent)) + "%";
  }
}

/** 四态：wait（等待）/ warn（等太久）/ ok（成功）。 */
function setPhase(phase) {
  if (!launchCard) return;
  launchCard.dataset.phase = phase;
  if (statusBadge) {
    statusBadge.classList.toggle("ok", phase === "ok");
    statusBadge.classList.toggle("warn", phase === "warn");
  }
}

function setTip(html, tone) {
  if (!tipBox) return;
  if (!html) { tipBox.hidden = true; return; }
  tipBox.hidden = false;
  if (tipText) tipText.innerHTML = html;
  if (tone) tipBox.dataset.tone = tone; else delete tipBox.dataset.tone;
}

async function closeSelf() {
  try {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      await chrome.runtime.sendMessage({ type: "bridge-cleanup-launch-tabs" });
      return;
    }
  } catch (e) {}
  try {
    if (chrome.tabs && chrome.tabs.getCurrent) {
      chrome.tabs.getCurrent((tab) => {
        if (tab?.id) { chrome.tabs.remove(tab.id).catch(() => {}); return; }
        window.close();
      });
      return;
    }
  } catch (e) {}
  try { window.close(); } catch (e) {}
}

async function triggerSchemeLaunch() {
  try {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      await chrome.runtime.sendMessage({ type: "bridge-trigger-scheme" });
      return;
    }
  } catch (e) {}
  try { window.location.href = "pocketfleet://open"; } catch (e) {}
}

async function checkAndRestore() {
  try {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      const res = await chrome.runtime.sendMessage({ type: "bridge-window-restore" });
      if (res && res.ok) { handleRestoreSuccess(); return true; }
    }
  } catch (e) {}

  // 备用兜底直接直连本地端口
  try {
    const stored = (chrome.storage && chrome.storage.local)
      ? await chrome.storage.local.get({ token: "", endpoint: "http://127.0.0.1:18765" })
      : { token: "", endpoint: "http://127.0.0.1:18765" };
    const headers = { "Content-Type": "application/json" };
    if (stored.token) headers["Authorization"] = `Bearer ${stored.token.trim()}`;
    if (chrome.runtime && chrome.runtime.id) headers["X-Folded-Host-Extension-ID"] = chrome.runtime.id;

    const res = await fetch(`${stored.endpoint || "http://127.0.0.1:18765"}/api/v1/window/restore`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(600)
    });
    if (res.ok) { handleRestoreSuccess(); return true; }
  } catch (e) {}
  return false;
}

function handleRestoreSuccess() {
  if (isConnected) return;
  isConnected = true;
  setPhase("ok");
  if (statusText) statusText.textContent = t("success");
  if (subTitleText) subTitleText.textContent = t("successSub");
  if (headline) headline.textContent = t("success");
  if (footText) footText.textContent = t("footOk");
  if (progressBar) progressBar.style.width = "100%";
  setTip(""); // 成功就收起提示块，避免"未勾选始终允许"的误导
  if (btnRetry) btnRetry.disabled = true;
  if (btnRetryLabel) btnRetryLabel.textContent = t("retry");
  try { chrome.runtime.sendMessage({ type: "bridge-cleanup-launch-tabs" }).catch(() => {}); } catch (e) {}
  setTimeout(closeSelf, 800);
}

// 页面加载后立即尝试探活，若未启动则唤起协议
window.addEventListener("DOMContentLoaded", async () => {
  // 先定语言再渲染：多语言必须在首帧之前完成，否则会闪一下错误语言再跳变。
  LANG = await detectLocale();
  setPhase("wait");
  setProgress(8);
  applyStaticI18n();

  const alreadyUp = await checkAndRestore();
  if (alreadyUp) { setProgress(100); return; }
  setProgress(18);
  setTimeout(triggerSchemeLaunch, 100);
});

// 轮询探活状态：探查 6 次，每次间隔 1 秒（总计 6 秒），若未响应立即彻底停下，杜绝无休止刷新
const MAX_POLLS = 6;
let timer = setInterval(async () => {
  if (isConnected) { clearInterval(timer); timer = null; return; }
  pollCount++;
  // 进度随轮询推进，渐近 90%
  setProgress(18 + Math.min(72, pollCount * 12));
  const success = await checkAndRestore();
  if (success) {
    if (timer) { clearInterval(timer); timer = null; }
    return;
  }
  if (!statusText) return;
  if (pollCount >= MAX_POLLS) {
    // 达到 6 次上限，果断销毁定时器彻底停下，界面进入静止等待态
    if (timer) { clearInterval(timer); timer = null; }
    setPhase("warn");
    statusText.textContent = t("notYet");
    setTip(t("tipStuck"), "deep");
    if (btnRetry) btnRetry.disabled = false;
  }
}, 1000);

if (btnRetry) {
  btnRetry.addEventListener("click", async () => {
    if (btnRetry.disabled) return;
    btnRetry.disabled = true;
    setPhase("wait");
    setProgress(30);
    if (statusText) statusText.textContent = t("retrying");
    
    // 手动重试：先查一次
    const success = await checkAndRestore();
    if (success) return;

    // 唤起协议
    await triggerSchemeLaunch();

    // 随后仅做 3 次简短复查（每次 1 秒），失败彻底停下
    let retryAttempts = 0;
    const retryTimer = setInterval(async () => {
      retryAttempts++;
      setProgress(30 + retryAttempts * 20);
      if (await checkAndRestore()) {
        clearInterval(retryTimer);
        return;
      }
      if (retryAttempts >= 3) {
        clearInterval(retryTimer);
        setPhase("warn");
        if (statusText) statusText.textContent = t("stillNot");
        setTip(t("tipStuck"), "deep");
        if (btnRetry) btnRetry.disabled = false;
      }
    }, 1000);
  });
}

const btnClose = document.getElementById("btnCloseTab");
if (btnClose) btnClose.addEventListener("click", closeSelf);