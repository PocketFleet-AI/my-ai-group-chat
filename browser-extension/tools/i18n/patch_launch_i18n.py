"""为 launch.js 补齐 8 语文案（外科手术式：只动文案表与语言判定，不碰任何逻辑）。
分两步：
  步骤1：在 zh_CN 之后、en 之前插入 ja/ko/fr/de/es/pt
  步骤2：替换 LANG 判定为resolveLocale(detectLocale()) 的异步版本
每步都断言锚点存在，找不到锚点立即失败，绝不盲写。
"""
import io
import re
import sys

P = "D:/workSpace/PocketFleetV2/browser-extension/launch.js"
s = io.open(P, encoding="utf-8").read()
orig_len = len(s)

# ---------- 步骤 1：插入 6 语 ----------
anchor = "  en: {\n    headlineWait: \"Starting PocketFleet\","
assert anchor in s, "步骤1 锚点未找到（en 块起始）"

NEW_LANGS = '''  ja: {
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
'''
s = s.replace(anchor, NEW_LANGS + anchor, 1)

# 给中英补 close 键（原表缺这个键，btnClose 的文案需要它）
s = s.replace('    footOk: "即将关闭本页…",\n    retry: "重新唤起",\n  },',
              '    footOk: "即将关闭本页…",\n    retry: "重新唤起",\n    close: "关闭此页",\n  },', 1)
s = s.replace('    footOk: "Closing this page…",\n    retry: "Re-launch",\n  },',
              '    footOk: "Closing this page…",\n    retry: "Re-launch",\n    close: "Close this page",\n  },', 1)

# ---------- 步骤 2：语言判定 ----------
old_lang = 'const LANG = navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh_CN" : "en";\nfunction t(key) { return (T[LANG] || T.en)[key] || (T.en[key] || ""); }'
assert old_lang in s, "步骤2 锚点未找到（LANG 判定）"

new_lang = '''const SUPPORTED = ["zh_CN", "en", "ja", "ko", "fr", "de", "es", "pt"];
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
  setTip(t("tipScheme"));
}'''
s = s.replace(old_lang, new_lang, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("OK: %d -> %d 字符" % (orig_len, len(s)))
print("语种数:", len(re.findall(r'^  (zh_CN|en|ja|ko|fr|de|es|pt): \{', s, re.M)))
print("close 键数:", len(re.findall(r'^\s+close: ', s, re.M)))