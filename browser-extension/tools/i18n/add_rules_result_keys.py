"""补「规则更新结果」两个 i18n 键（八语）。
背景：后台 selector_updates.js 原先返回硬编码中文成品文案
（'已是最新规则' / '规则已保存…'），英文界面里直接显示中文。已改为返回
messageKey，由 popup 侧 t() 翻译，因此这两个键现在真正被消费。
"""
import io
import json
import os

T = {
    "en": {
        "rulesUpToDate": "Page rules are already up to date.",
        "rulesAppliedOnIdle": "Rules saved — idle pages will pick them up. Running tasks keep the current config.",
    },
    "zh_CN": {
        "rulesUpToDate": "页面规则已是最新。",
        "rulesAppliedOnIdle": "规则已保存，空闲页面将应用；正在运行的任务不会切换配置。",
    },
    "ja": {
        "rulesUpToDate": "ページルールはすでに最新です。",
        "rulesAppliedOnIdle": "ルールを保存しました。アイドル状態のページに適用されます。実行中のタスクは現在の設定のままです。",
    },
    "ko": {
        "rulesUpToDate": "페이지 규칙이이미 최신입니다.",
        "rulesAppliedOnIdle": "규칙이 저장되었습니다. 유휴 상태 페이지에 적용되며, 실행 중인 작업은 현재 설정을 유지합니다.",
    },
    "fr": {
        "rulesUpToDate": "Les règles de page sont déjà à jour.",
        "rulesAppliedOnIdle": "Règles enregistrées — les pages inactives les appliqueront. Les tâches en cours conservent la configuration actuelle.",
    },
    "de": {
        "rulesUpToDate": "Die Seitenregeln sind bereits aktuell.",
        "rulesAppliedOnIdle": "Regeln gespeichert — inaktive Seiten übernehmen sie. Laufende Aufgaben behalten die aktuelle Konfiguration.",
    },
    "es": {
        "rulesUpToDate": "Las reglas de página ya están actualizadas.",
        "rulesAppliedOnIdle": "Reglas guardadas: las páginas inactivas las aplicarán. Las tareas en curso mantienen la configuración actual.",
    },
    "pt": {
        "rulesUpToDate": "As regras de página já estão atualizadas.",
        "rulesAppliedOnIdle": "Regras guardadas — as páginas inativas vão aplicá-las. As tarefas em curso mantêm a configuração atual.",
    },
}

base = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_locales")
)
for loc, add in T.items():
    path = os.path.join(base, loc, "messages.json")
    with io.open(path, encoding="utf-8") as f:
        data = json.load(f)
    for k, v in add.items():
        data[k] = {"message": v}
    ordered = {k: data[k] for k in sorted(data)}
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
    print(loc, len(ordered), "keys")