"""加一条断言：禁止后台脚本把成品文案（尤其中文）直接返回给 UI。
背景：2026-10-13 指挥官发现英文界面里混进中文「已是最新规则」。
根因：selector_updates.js 硬编码中文 message 并原样透传到 popup 的输出行。
正解：后台只返回 i18n key，由popup 侧 t() 翻译（才能随语言切换重绘）。
"""
import io

P = "D:/workSpace/PocketFleetV2/browser-extension/tests/popup_ui_behavior.test.js"
s = io.open(P, encoding="utf-8").read()

if "禁止成品文案穿透到UI" in s:
    print("断言已存在")
    raise SystemExit(0)

NEW = r'''test("禁止成品文案穿透到 UI（2026-10-13：英文界面混进中文「已是最新规则」）", () => {
  const fs2 = require("fs");
  const bg = fs2.readFileSync(__dirname + "/../selector_updates.js", "utf8");
  // 后台不得出现 message:'中文…' 这类成品文案
  assert.ok(
    !/message:\s*['"][^'"]*[\u4e00-\u9fff]/.test(bg),
    "selector_updates.js 不得返回硬编码中文文案，应返回 messageKey 交由 UI 翻译"
  );
  // 必须提供 messageKey，且这两个键在八语包里都存在
  assert.ok(/messageKey:\s*'rulesUpToDate'/.test(bg), "须返回 rulesUpToDate 键");
  assert.ok(/messageKey:\s*'rulesAppliedOnIdle'/.test(bg), "须返回 rulesAppliedOnIdle 键");
  // popup 侧必须消费 messageKey 并走 t()
  assert.ok(
    /setOutput\("ok",\s*r\.data\.messageKey\s*\|\|\s*r\.data\.message\)/.test(popupJs),
    "popup 须优先用 messageKey 翻译，回退旧 message"
  );
});

'''

anchor = "(async () => {"
assert anchor in s
s = s.replace(anchor, NEW + anchor, 1)
io.open(P, "w", encoding="utf-8").write(s)
print("断言已写入")