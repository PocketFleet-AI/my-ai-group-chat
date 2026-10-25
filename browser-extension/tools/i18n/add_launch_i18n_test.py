"""给 popup_ui_behavior.test.js 加「接力页八语自适配」断言。
用文件方式写入，避免 shell heredoc 的转义问题（同launch.js i18n 补丁的教训）。
"""
import io

P = "D:/workSpace/PocketFleetV2/browser-extension/tests/popup_ui_behavior.test.js"
s = io.open(P, encoding="utf-8").read()

if "const launchJs" not in s:
    marker = "const css ="
    assert marker in s, "未找到 const css = 锚点"
    s = s.replace(
        marker,
        "const launchJs = fs.readFileSync(__dirname + '/../launch.js', 'utf8');\n" + marker,
        1,
    )

if "接力页八语自适配" in s:
    print("断言已存在，跳过")
else:
    NEW = (
        'test("接力页八语自适配（2026-10-13：此前只有中/英，其余 6 语看英文）", () => {\n'
        '  const vm = require("vm");\n'
        '  const table = launchJs.match(/const T = \\{[\\s\\S]*?\\n\\};/);\n'
        '  assert.ok(table, "launch.js 必须含 T 文案表");\n'
        '  const ctx = {};\n'
        '  vm.createContext(ctx);\n'
        '  vm.runInContext(table[0] + "; this.__T = T;", ctx);\n'
        '  const T = ctx.__T;\n'
        '  const LANGS = ["zh_CN", "en", "ja", "ko", "fr", "de", "es", "pt"];\n'
        '  const KEYS = ["headlineWait", "subtitleWait", "waiting", "retrying", "notYet",\n'
        '    "stillNot", "success", "successSub", "tipScheme", "tipStuck", "footWait",\n'
        '    "footOk", "retry", "close"];\n'
        '  for (const lang of LANGS) {\n'
        '    assert.ok(T[lang], "缺语种：" + lang);\n'
        '    for (const k of KEYS) {\n'
        '      assert.ok(T[lang][k] && String(T[lang][k]).trim(), lang + " 缺文案：" + k);\n'
        '    }\n'
        '  }\n'
        '  // 语言判定必须走 resolveLocale（BCP-47 收敛），不能只做 zh/en 二分\n'
        '  assert.ok(/function resolveLocale/.test(launchJs), "须有 resolveLocale");\n'
        '  assert.ok(/chrome\\.i18n\\.getUILanguage/.test(launchJs), "须优先读扩展 UI 语言");\n'
        '  assert.ok(!/startsWith\\("zh"\\)\\s*\\?\\s*"zh_CN"\\s*:\\s*"en"/.test(launchJs),\n'
        '    "不得再用 zh/en 二分判定（这正是六语失效的根因）");\n'
        '  assert.ok(/LANG = await detectLocale\\(\\)/.test(launchJs), "启动须先定语言再渲染");\n'
        '  assert.ok(/function applyStaticI18n/.test(launchJs), "须有统一文案刷新函数");\n'
        '});\n\n'
    )
    anchor = "(async () => {"
    assert anchor in s, "未找到测试执行器锚点"
    s = s.replace(anchor, NEW + anchor, 1)
    io.open(P, "w", encoding="utf-8").write(s)
    print("断言已写入")

# 确认 fs 已引入
if "require(\"fs\")" not in s and "require('fs')" not in s:
    print("⚠ 需确认 fs 是否已引入")
else:
    print("fs 已引入")