"""tests/popup_ui_behavior.test.js：匹配 2026-10-13 的设计变更。

变更内容（指挥官定）：
  1. 插件行不再有手动更新按钮（商店自动更新 / 本地手动替换，两种形态都装不上＝死按钮）；
     改为打开弹窗时静默检查一次，「最新版本」列仍是活列。
  2. 规则行保留手动「更新」按钮，并加SVG 下载图标。
  3. 熔断按钮图标随状态切换（省略号 / 暂停 / 播放三角）。
  4. 两处按钮统一 min-width:76px、高度 22px。

纪律：改断言而非改实现——因为设计是指挥官定的。
但必须同时补上新行为的断言，不能只是把旧断言删掉了事。
"""
import io

P = 'tests/popup_ui_behavior.test.js'
s = io.open(P, encoding='utf-8').read()

# --- 1) 「两个独立入口」测试：改为「插件无手动入口 + 规则有」 ---
old1 = """test("插件更新与规则更新是两个独立入口，不合并", async () => {
  assert.ok(html.includes('id="checkExtensionUpdate"'), "缺插件更新入口");
  assert.ok(html.includes('id="checkRuleUpdate"'), "缺规则更新入口");
  assert.ok(!html.includes('id="updateSelectors"'), "旧合并按钮应已拆除");
  assert.ok(js.includes("requestUpdateCheck"), "未接 Chrome 插件更新检查");
  assert.ok(js.includes("{ type: 'selector-update' }") || js.includes('type: "selector-update"'), "规则更新链路丢失");
});"""
new1 = """test("插件更新无手动按钮（2026-10-13 指挥官定：死按钮不提供），规则更新保留手动入口", () => {
  // 商店版由浏览器自动更新、本地版只能手动替换文件——手动按钮在两种形态下都装不上。
  assert.ok(!html.includes('id="checkExtensionUpdate"'), "插件行不应再有手动更新按钮");
  assert.ok(html.includes('id="checkRuleUpdate"'), "规则更新按钮必须保留");
  assert.ok(!html.includes('id="updateSelectors"'), "旧合并按钮应已拆除");
  // 但「最新版本」列不能是死列：改为打开弹窗时静默检查一次
  assert.ok(js.includes("requestUpdateCheck"), "未接 Chrome 插件更新检查");
  assert.ok(js.includes("checkExtensionUpdateOnce"), "插件检查须以自动方式调用");
  assert.ok(/checkExtensionUpdateOnce\(\);/.test(js), "初始化时须调用一次插件检查");
  // 规则更新链路不得因去掉插件按钮而被牵连
  assert.ok(js.includes("{ type: 'selector-update' }") || js.includes('type: "selector-update"'), "规则更新链路丢失");
});"""

# --- 2) 「两个更新入口」ID 清单：去掉 checkExtensionUpdate ---
old2 = """  for (const id of ["aboutExtVersion", "latestExtVersion", "currentRuleVersion", "latestRuleVersion", "checkExtensionUpdate", "checkRuleUpdate"]) {"""
new2 = """  for (const id of ["aboutExtVersion", "latestExtVersion", "currentRuleVersion", "latestRuleVersion", "checkRuleUpdate"]) {"""

# --- 3) 「插件检查」测试：改成测自动检查路径，不再 dispatch 点击 ---
old3 = """  await env.nodes.checkExtensionUpdate.dispatch("click");
  assert.strictEqual(env.nodes.latestExtVersion.textContent, "v0.8.4");
  result = { status: "no_update" };
  await env.nodes.checkExtensionUpdate.dispatch("click");
  assert.strictEqual(env.nodes.latestExtVersion.textContent, env.tables.en.updateNoNewVersion.message);
  result = { status: "throttled" };
  await env.nodes.checkExtensionUpdate.dispatch("click");
  assert.strictEqual(env.nodes.latestExtVersion.textContent, env.tables.en.extUpdateThrottled.message);
});"""
new3 = """  // 2026-10-13 起插件检查改为打开弹窗时自动跑一次，不再由按钮触发。
  // 这里验证三种状态经由 checkExtensionUpdateOnce 后都能正确落到「最新版本」列。
  for (const [status, expected] of [
    ["update_available", "v0.8.4"],
    ["no_update", env.tables.en.updateNoNewVersion.message],
    ["throttled", env.tables.en.extUpdateThrottled.message],
  ]) {
    result = { status, version: "0.8.4" };
    const env2 = makeEnv({ updateCheck: async () => result });
    evalPopup(env2); await settle(); await settle(); await settle();
    assert.strictEqual(env2.nodes.latestExtVersion.textContent, expected, "状态 " + status + " 显示不对");
  }
});"""

# --- 4) 常驻卡片测试：去掉 checkExtensionUpdate 断言 ---
old4 = """  assert.ok(html.includes('id="checkExtensionUpdate"'), "缺插件更新按钮");"""
new4 = """  assert.ok(!html.includes('id="checkExtensionUpdate"'), "插件行不应有更新按钮");"""

edits = [(old1, new1), (old2, new2), (old3, new3), (old4, new4)]
for old, new in edits:
    assert old in s, '锚点未找到：\n' + old[:70]
    assert s.count(old) == 1, '锚点不唯一'
    s = s.replace(old, new, 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('测试已改为匹配新设计（4 处）')