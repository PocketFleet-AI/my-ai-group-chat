"""为「版本与更新」新布局补八语i18n 键。
新增：pluginVersionName / ruleVersionName / update
旧的 currentPluginVersion / currentRuleVersion / latestVersion / checkExtUpdate /
checkAndUpdateRules 在新结构里不再使用（最新版本列没有独立标签，靠列位表达），
但**保留不删**——popup.js 或历史文案可能仍引用，删除会连带触发 i18n 回退。
"""
import io
import json
import os

T = {
    "en": {"pluginVersionName": "Extension", "ruleVersionName": "Rules", "update": "Update"},
    "zh_CN": {"pluginVersionName": "插件版本", "ruleVersionName": "规则版本", "update": "更新"},
    "ja": {"pluginVersionName": "拡張機能", "ruleVersionName": "ルール", "update": "更新"},
    "ko": {"pluginVersionName": "확장 프로그램", "ruleVersionName": "규칙", "update": "업데이트"},
    "fr": {"pluginVersionName": "Extension", "ruleVersionName": "Règles", "update": "Mettre à jour"},
    "de": {"pluginVersionName": "Erweiterung", "ruleVersionName": "Regeln", "update": "Aktualisieren"},
    "es": {"pluginVersionName": "Extensión", "ruleVersionName": "Reglas", "update": "Actualizar"},
    "pt": {"pluginVersionName": "Extensão", "ruleVersionName": "Regras", "update": "Atualizar"},
}

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_locales")
for loc, add in T.items():
    path = os.path.normpath(os.path.join(base, loc, "messages.json"))
    with io.open(path, encoding="utf-8") as f:
        data = json.load(f)
    for k, v in add.items():
        data[k] = {"message": v}
    ordered = {k: data[k] for k in sorted(data)}
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
    print(loc, len(ordered), "keys")