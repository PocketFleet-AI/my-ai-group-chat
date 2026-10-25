"""为 Actions 卡片补 i18n 键（九语），保持集合一致。用法：python add_actions_keys.py"""
import io
import json
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_locales")

T = {
    "en": {"actionsTitle": "Actions", "actionsHint": "Save the connection settings or test whether the local bridge can be reached."},
    "zh_CN": {"actionsTitle": "操作", "actionsHint": "保存连接设置，或测试本地桥是否可达。"},
    "zh_TW": {"actionsTitle": "操作", "actionsHint": "儲存連線設定，或測試本機橋接是否可連線。"},
    "ja": {"actionsTitle": "操作", "actionsHint": "接続設定を保存するか、ローカルブリッジに接続できるか確認します。"},
    "ko": {"actionsTitle": "작업", "actionsHint": "연결 설정을 저장하거나 로컬 브리지에 연결할 수 있는지 확인합니다."},
    "fr": {"actionsTitle": "Actions", "actionsHint": "Enregistrer les paramètres de connexion ou vérifier que le pont local est joignable."},
    "de": {"actionsTitle": "Aktionen", "actionsHint": "Verbindungseinstellungen speichern oder prüfen, ob die lokale Bridge erreichbar ist."},
    "es": {"actionsTitle": "Acciones", "actionsHint": "Guarde la configuración de conexión o comprueba si el puente local está accesible."},
    "pt": {"actionsTitle": "Ações", "actionsHint": "Salve as configurações de conexão ou verifique se a ponte local está acessível."},
}

for loc, add in T.items():
    path = os.path.join(BASE, loc, "messages.json")
    with io.open(path, encoding="utf-8") as f:
        data = json.load(f)
    for k, v in add.items():
        # messages.json 的值必须是 {"message": "..."} 对象，写成裸字符串会让 t() 取不到
        data[k] = v if isinstance(v, dict) else {"message": v}
    ordered = {k: data[k] for k in sorted(data)}
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
    print(loc, len(ordered))