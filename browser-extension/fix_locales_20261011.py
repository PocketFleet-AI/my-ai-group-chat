"""修复 21:35 那批被 PowerShell 管道传参毁掉的中文/多语言文案。
改用独立脚本文件执行，避免 shell 管道再次破坏非ASCII 字符。
"""
import collections
import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent / "_locales"

FIX = {
    "en": {
        "rulesTitle": "Page Rule Configuration",
        "rulesCardHint": "Check and update page matching rules to stay synchronized with cloud configuration.",
        "connSettings": "Connection Settings",
        "connSettingsHint": "Local endpoint, authentication token and connection test.",
        "aboutHint": "Extension program updates are handled by the browser; page rules are downloaded separately.",
    },
    "zh_CN": {
        "rulesTitle": "页面规则配置",
        "rulesCardHint": "检查并更新页面匹配规则，与云端配置保持同步。",
        "connSettings": "连接设置",
        "connSettingsHint": "本机端点、通信令牌与连接测试。",
        "aboutHint": "插件程序更新由浏览器处理；页面规则单独下载。",
    },
    "zh_TW": {
        "rulesTitle": "頁面規則設定",
        "rulesCardHint": "檢查並更新頁面匹配規則，與雲端設定保持同步。",
        "connSettings": "連線設定",
        "connSettingsHint": "本機端點、通訊權杖與連線測試。",
        "aboutHint": "擴充功能程式更新由瀏覽器處理；頁面規則單獨下載。",
    },
    "ja": {
        "rulesTitle": "ページルール設定",
        "rulesCardHint": "ページマッチングルールを確認・更新し、クラウド設定と同期させます。",
        "connSettings": "接続設定",
        "connSettingsHint": "ローカルエンドポイント、認証トークン、接続テスト。",
        "aboutHint": "拡張機能の更新はブラウザーが処理します。ページルールは別途ダウンロードされます。",
    },
    "ko": {
        "rulesTitle": "페이지 규칙 설정",
        "rulesCardHint": "페이지 매칭 규칙을 확인·업데이트하여 클라우드 설정과 동기화합니다.",
        "connSettings": "연결 설정",
        "connSettingsHint": "로컬 엔드포인트, 인증 토큰, 연결 테스트.",
        "aboutHint": "확장 프로그램 업데이트는 브라우저가 처리합니다. 페이지 규칙은 별도로 다운로드됩니다.",
    },
    "fr": {
        "rulesTitle": "Configuration des règles de page",
        "rulesCardHint": "Vérifiez et mettez à jour les règles de correspondance pour rester synchronisé avec la configuration cloud.",
        "connSettings": "Paramètres de connexion",
        "connSettingsHint": "Point d'accès local, jeton d'authentification et test de connexion.",
        "aboutHint": "Les mises à jour de l'extension sont gérées par le navigateur ; les règles de page se téléchargent séparément.",
    },
    "de": {
        "rulesCardHint": "Regeln zur Seitenerkennung prüfen und aktualisieren, um mit der Cloud-Konfiguration synchron zu bleiben.",
        "aboutHint": "Updates der Erweiterung übernimmt der Browser; Seitenregeln werden separat heruntergeladen.",
    },
    "es": {
        "rulesTitle": "Configuración de reglas de página",
        "rulesCardHint": "Comprueba y actualiza las reglas de coincidencia de página para mantenerte sincronizado con la configuración en la nube.",
        "connSettings": "Ajustes de conexión",
        "connSettingsHint": "Punto de acceso local, token de autenticación y prueba de conexión.",
        "aboutHint": "Las actualizaciones de la extensión las gestiona el navegador; las reglas de página se descargan aparte.",
    },
    "pt": {
        "rulesTitle": "Configuração de regras de página",
        "rulesCardHint": "Verifique e atualize as regras de correspondência de página para manter a sincronização com a configuração na nuvem.",
        "connSettings": "Definições de ligação",
        "connSettingsHint": "Endpoint local, token de autenticação e teste de ligação.",
        "aboutHint": "As atualizações da extensão são tratadas pelo navegador; as regras de página são transferidas em separado.",
    },
}


def main() -> None:
    for loc, values in FIX.items():
        path = BASE / loc / "messages.json"
        data = json.loads(path.read_text(encoding="utf-8-sig"), object_pairs_hook=collections.OrderedDict)
        for key, text in values.items():
            data[key] = {"message": text}
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        # 复验
        check = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
        broken = [k for k, v in check.items() if "?" in v["message"]]
        print(f"{loc:6} keys={len(check):3} 残留损坏={broken or 'none'}  rulesTitle={check['rulesTitle']['message']}")


if __name__ == "__main__":
    main()