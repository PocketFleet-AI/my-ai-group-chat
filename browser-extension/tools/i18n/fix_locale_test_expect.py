"""修正偏好链测试的期望值——**改测试，不改产品**。

诊断结论（tools/i18n/diag_run.js 实测）：
detectLocale 的优先级是「用户显式选择 > chrome.i18n.getUILanguage() > navigator.language」。
`chrome.i18n.getUILanguage` 在真实扩展环境**恒存在**，因此后两级只在它缺席时生效。
我原先把「无显式偏好时应回落浏览器语言」当成期望，是错的——那一层被getUILanguage 挡住了。

同时修复提取正则：`function ` → `(?:async )?function `，
否则 detectLocale 的 async 关键字被截掉，在vm 里直接语法错（这才是最初那条报错的真因）。
"""
import io

P = "D:/workSpace/PocketFleetV2/browser-extension/tests/popup_ui_behavior.test.js"
s = io.open(P, encoding="utf-8").read()

# 1) 修提取正则：必须保留 async，否则被提取的函数体里出现裸 await
old_pick = '''  const pick = (name) => {
    const m = launchJs.match(new RegExp("function " + name + "\\\\([\\\\s\\\\S]*?\\\\n}"));
    return m ? m[0] : "";
  };'''
new_pick = '''  // 注意：必须带 (?:async )?，否则 detectLocale 的 async 被截掉，
  // 函数体里的 await 会在 vm 中触发 "await is only valid in async functions"。
  const pick = (name) => {
    const m = launchJs.match(new RegExp("(?:async )?function " + name + "\\\\([\\\\s\\\\S]*?\\\\n}"));
    return m ? m[0] : "";
  };'''
assert old_pick in s, "未找到 pick 定义"
s = s.replace(old_pick, new_pick, 1)

# 2) 取回结果：IIFE 内的 this 不是 vm 全局对象，必须用 globalThis
old_ret = '''    ctx.__p = new Promise((resolve) => {
      vm.runInContext(
        "(async () => {\\n" +
        "const SUPPORTED=['zh_CN','en','ja','ko','fr','de','es','pt'];\\n" +
        "const LANG_PREF_KEY='pf_ui_locale';\\n" +
      resolveSrc + "\\n" + detectSrc + "\\n" +
        "this.__r = await detectLocale();\\n" +
        "})();",
        ctx
      );
    });
    return ctx.__p;'''
new_ret = '''    vm.runInContext(
      "(async () => {\\n" +
      "const SUPPORTED=['zh_CN','en','ja','ko','fr','de','es','pt'];\\n" +
      "const LANG_PREF_KEY='pf_ui_locale';\\n" +
      resolveSrc + "\\n" + detectSrc + "\\n" +
      "globalThis.__p = detectLocale();\\n" +
      "})();",
      ctx
    );
    return ctx.__p;'''
assert old_ret in s, "未找到取回结果段"
s = s.replace(old_ret, new_ret, 1)

# 3) 修正期望值：getUILanguage 优先于 navigator.language
old_cases = '''  // 场景2：无显式偏好时回落到浏览器语言
  assert.strictEqual(await runDetect({}, "en-US", "ja-JP"), "ja", "无偏好时应回落浏览器语言");
  // 场景3：区域后缀收敛
  assert.strictEqual(await runDetect({}, "en-US", "fr-CA"), "fr", "fr-CA 应收敛到 fr");
  assert.strictEqual(await runDetect({}, "en-US", "de-AT"), "de", "de-AT 应收敛到 de");
  // 场景4：不受支持的语言回退 en，不抛错
  assert.strictEqual(await runDetect({}, "en-US", "ru-RU"), "en", "不支持的语言应回退 en");'''
new_cases = '''  // 场景2：优先级 —— 扩展 UI 语言(getUILanguage) 高于浏览器语言。
  // 这与 detectLocale 的注释「用户显式选择 > 扩展 UI 语言 > 浏览器语言」一致。
  assert.strictEqual(await runDetect({}, "fr-FR", "ja-JP"), "fr",
    "扩展 UI 语言应优先于浏览器语言");
  // 场景3：区域后缀收敛（两级都走 resolveLocale）
  assert.strictEqual(await runDetect({}, "fr-CA", "en-US"), "fr", "fr-CA 应收敛到 fr");
  assert.strictEqual(await runDetect({ pf_ui_locale: "de-AT" }, "en-US", "en-US"), "de",
    "用户偏好 de-AT 应收敛到 de");
  // 场景4：不支持的语言回退 en，不抛错
  assert.strictEqual(await runDetect({}, "ru-RU", "en-US"), "en", "不支持的语言应回退 en");
  // 场景5：getUILanguage 缺席时才回落浏览器语言
  assert.strictEqual(await runDetect({}, "", "ja-JP"), "ja",
    "getUILanguage 为空时应回落浏览器语言");'''
assert old_cases in s, "未找到期望值段"
s = s.replace(old_cases, new_cases, 1)

io.open(P, "w", encoding="utf-8").write(s)
print("测试期望已按实测行为修正（产品代码未改）")