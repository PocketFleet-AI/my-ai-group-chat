"""测试：锁住 C 方案的配色分工。

为什么要锁：配色不是审美偏好，是**语义契约**——
  黄 = 要动手配 ｜ 近白 = 只读｜ 蓝灰 = 看信息 ｜ 肉红 = 危险操作
后人看到「肉色用在一个普通设置区」会觉得莫名其妙、改回去，就破坏了「红色只给危险」的规则。

关键修正（首版失败教训）：断言**必须按 data-i18n 键定位，不能按可见文案**——
HTML 里的中文占位文案会随语言/改版变化，用文案定位必然误报。
配色类名与 i18n 键是两套独立标识，断言里要把它们关联起来。
"""
import io

P = 'tests/popup_ui_behavior.test.js'
s = io.open(P, encoding='utf-8').read()

# 删掉首版（按文案定位，必然误报）
start = s.index('test("配色按语义分工')
end = s.index('(async () => {\n  let pass = 0;', start)
s = s[:start] + s[end:]

anchor = '(async () => {\n  let pass = 0;'
assert s.count(anchor) == 1, '执行器锚点不唯一'

NEW = '''test("配色按语义分工（2026-10-20 指挥官采纳 C 方案）：暖色只给可配置、红色只给危险", () => {
  // 按 data-i18n 键定位，不按可见文案 —— 文案随语言与改版变化，用文案定位必然误报。
  // 锁「哪个区块用哪个语义类」，不锁具体色值：色值可微调，语义分工不能改。
  const blockOf = (i18nKey) => {
    const at = html.indexOf('data-i18n="' + i18nKey + '"');
    assert.ok(at > 0, "找不到 i18n 键：" + i18nKey);
    // 往前找最近的区块开标签（fold tint-xxx）
    const head = html.slice(Math.max(0, at - 400), at);
    const m = head.match(/class="fold (tint-[a-z]+)/);
    assert.ok(m, i18nKey + " 所在区块没有 tint-* 语义类");
    return m[1];
  };

  assert.strictEqual(blockOf("connTitle"), "tint-amber", "连接设置＝可配置＝唯一暖色");
  assert.strictEqual(blockOf("protocolTitle"), "tint-slate", "协同规范＝只读＝最淡");
  assert.strictEqual(blockOf("aboutTitle"), "tint-blue", "关于与更新＝信息＝冷色");

  // 肉色必须从折叠区彻底退场 —— 它已被「执行总开关」的 Pause 独占
  assert.ok(!/class="fold tint-rose/.test(html), "tint-rose 不得再用于任何区块：红色只留给危险操作");
  assert.ok(!/\\.fold\\.tint-rose/.test(css), "CSS 不应残留 tint-rose 死规则");
});

'''

io.open(P, 'w', encoding='utf-8').write(s.replace(anchor, NEW + anchor, 1))
print('配色语义断言已改为按键定位')