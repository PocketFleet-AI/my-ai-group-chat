"""为 v3 重做新增的 i18n 键补齐八语。"""
import io
import json
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_locales")

T = {
    "en": {"nextTitle": "Next: nothing to do", "offlineTitle": "Next: start PocketFleet first",
           "rulesTitleShort": "Page rules", "ruleSourceBuiltin": "builtin", "ruleSourceCloud": "current"},
    "zh_CN": {"nextTitle": "下一步：暂时无需操作", "offlineTitle": "下一步：请先打开 PocketFleet",
              "rulesTitleShort": "页面规则", "ruleSourceBuiltin": "内置", "ruleSourceCloud": "当前"},
    "ja": {"nextTitle": "次：现阶段无需操作", "offlineTitle": "次：先に PocketFleet を開いてください",
           "rulesTitleShort": "ページルール", "ruleSourceBuiltin": "内蔵", "ruleSourceCloud": "現在"},
    "ko": {"nextTitle": "다음: 현재 할 일 없음", "offlineTitle": "다음: PocketFleet을 먼저 여세요",
           "rulesTitleShort": "페이지 규칙", "ruleSourceBuiltin": "내장", "ruleSourceCloud": "현재"},
    "fr": {"nextTitle": "Suite : rien à faire", "offlineTitle": "Suite : lancez d'abord PocketFleet",
           "rulesTitleShort": "Règles de page", "ruleSourceBuiltin": "intégré", "ruleSourceCloud": "actuel"},
    "de": {"nextTitle": "Nächstes: nichts zu tun", "offlineTitle": "Nächstes: PocketFleet zuerst öffnen",
           "rulesTitleShort": "Seitenregeln", "ruleSourceBuiltin": "integriert", "ruleSourceCloud": "aktuell"},
    "es": {"nextTitle": "Siguiente: nada que hacer", "offlineTitle": "Siguiente: abre PocketFleet primero",
           "rulesTitleShort": "Reglas de página", "ruleSourceBuiltin": "integrada", "ruleSourceCloud": "actual"},
    "pt": {"nextTitle": "Próximo: nada a fazer", "offlineTitle": "Próximo: abra o PocketFleet primeiro",
           "rulesTitleShort": "Regras de página", "ruleSourceBuiltin": "integrada", "ruleSourceCloud": "atual"},
}

for loc, add in T.items():
    path = os.path.join(BASE, loc, "messages.json")
    with io.open(path, encoding="utf-8") as f:
        data = json.load(f)
    for k, v in add.items():
        data[k] = v if isinstance(v, dict) else {"message": v}
    ordered = {k: data[k] for k in sorted(data)}
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
    print(loc, len(ordered))