"""补一条「偏好跨页传递」的行为测试——泥蛇 2026-10-13 指出：
我原来的断言只检查文案表与函数是否存在，**没有覆盖「弹窗选日语 → 接力页是否读日语」这条真实链路**。
本测试用隔离环境真实运行 detectLocale()，验证 storage 里的偏好真的生效。
"""
import io

P = "D:/workSpace/PocketFleetV2/browser-extension/tests/popup_ui_behavior.test.js"
s = io.open(P, encoding="utf-8").read()

if "偏好跨页传递" in s:
    print("测试已存在，跳过")
    raise SystemExit(0)

NEW = r'''test("偏好跨页传递（泥蛇 2026-10-13）：弹窗选日语，接力页必须读日语", () => {
  const vm = require("vm");
  // 隔离运行 launch.js 里的 resolveLocale + detectLocale，喂真实 storage 数据
  const pick = (name) => {
    const m = launchJs.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n}"));
    return m ? m[0] : "";
  };
  const resolveSrc = pick("resolveLocale");
  const detectSrc = pick("detectLocale");
  assert.ok(resolveSrc && detectSrc, "须能取出 resolveLocale 与 detectLocale");

  const runDetect = (stored, uiLang, navLang) => {
    const ctx = {
      chrome: {
        storage: { local: { get: async () => stored } },
        i18n: { getUILanguage: () => uiLang },
      },
      navigator: { language: navLang },
      console,
    };
    vm.createContext(ctx);
    vm.runInContext(
      "const SUPPORTED=['zh_CN','en','ja','ko','fr','de','es','pt'];\n" +
      "const LANG_PREF_KEY='pf_ui_locale';\n" +
      resolveSrc + "\n" + detectSrc + "\nthis.__r = await detectLocale();",
      ctx
    );
    return ctx.__r;
  };

  // 场景1：弹窗存了日语，Chrome UI 是 en-US，浏览器是 zh-CN ⇒ 必须返回 ja
  assert.strictEqual(
    runDetect({ pf_ui_locale: "ja" }, "en-US", "zh-CN"),
    "ja",
    "弹窗选了日语，接力页必须读日语（用户显式选择优先级最高）"
  );
  // 场景2：无显式偏好时回落到浏览器语言
  assert.strictEqual(runDetect({}, "en-US", "ja-JP"), "ja", "无偏好时应回落浏览器语言");
  // 场景3：区域后缀收敛
  assert.strictEqual(runDetect({}, "en-US", "fr-CA"), "fr", "fr-CA 应收敛到 fr");
  assert.strictEqual(runDetect({}, "en-US", "de-AT"), "de", "de-AT 应收敛到 de");
  // 场景4：不受支持的语言回退 en，不抛错
  assert.strictEqual(runDetect({}, "en-US", "ru-RU"), "en", "不支持的语言应回退 en");
});

test("偏好键必须与弹窗一致（pf_ui_locale），且不得有孤立写入方", () => {
  const popupPref = (popupJs.match(/LANG_PREF_KEY = "([^"]+)"/) || [])[1];
  const launchPref = (launchJs.match(/LANG_PREF_KEY = "([^"]+)"/) || [])[1];
  assert.ok(popupPref, "弹窗须声明 LANG_PREF_KEY");
  assert.ok(launchPref, "接力页须声明 LANG_PREF_KEY");
  assert.strictEqual(
    launchPref, popupPref,
    "接力页与弹窗的偏好键必须一致，否则用户选的语言传不过去（2026-10-13 真实缺陷）"
  );
  assert.ok(!/pf_launch_lang/.test(launchJs), "不得再使用孤立键 pf_launch_lang");
});

'''

anchor = "(async () => {"
assert anchor in s, "未找到测试执行器锚点"
s = s.replace(anchor, NEW + anchor, 1)

# popupJs 需要被读入
if "const popupJs" not in s:
    marker = "const launchJs ="
    assert marker in s, "未找到 launchJs 声明"
    s = s.replace(
        marker,
        "const popupJs = fs.readFileSync(__dirname + '/../popup.js', 'utf8');\n" + marker,
        1,
    )

io.open(P, "w", encoding="utf-8").write(s)
print("行为测试已写入")