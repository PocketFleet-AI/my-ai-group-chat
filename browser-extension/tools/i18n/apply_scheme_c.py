"""落地 C 方案：双色分工配色。

语义规则（指挥官 2026-10-20采纳）：
  Connection Settings = 黄（要动手配，唯一暖色）
  协同规范          = 近白（只读、从少展开，最淡）
  About & Updates   = 蓝灰（看信息，冷色）
  执行总开关         = 肉红（危险操作，唯一的红，名副其实）

另：已取消 About & updates 内容区填色（标题栏一色到底，下半页回归白底，
    视觉重心回到「执行总开关」）。

改法：把三块 tint 语义类重排 + 覆盖配色规则。不新增类名，避免动 HTML 语义结构。
"""
import io
import re

H = 'popup.html'
C = 'popup.css'

# ---------- HTML：重排 tint 类 ----------
hs = io.open(H, encoding='utf-8').read()

# 协同规范 tint-blue -> tint-slate（新增类：只读最淡）
old1 = '<details class="fold tint-blue">'
new1 = '<details class="fold tint-slate">'
assert hs.count(old1) == 1, '协同规范锚点异常'
hs = hs.replace(old1, new1, 1)

# About & updates tint-rose -> tint-blue（冷色=信息）
old2 = '<section class="fold tint-rose about-updates" id="aboutUpdates"'
new2 = '<section class="fold tint-blue about-updates" id="aboutUpdates"'
assert hs.count(old2) == 1, 'About 锚点异常'
hs = hs.replace(old2, new2, 1)

io.open(H, 'w', encoding='utf-8').write(hs)

# ---------- CSS：新增 tint-slate + 改About 标题色 ----------
cs = io.open(C, encoding='utf-8').read()

# 1) 新增 tint-slate（协同规范）：近白、最淡
anchor = '.fold.tint-blue > summary {'
assert cs.count(anchor) == 1, 'tint-blue 锚点异常'
SLATE = """.fold.tint-slate > summary {
  /* 只读区块（协同规范）：最淡一档，不与「要动手配」「信息」争注意力 */
  background: linear-gradient(150deg, rgba(248, 250, 253, .95), #eef2f8);
  border-radius: 9px;
  color: #5a6b85;
}
"""
cs = cs.replace(anchor, SLATE + anchor, 1)

# 2) About 标题栏：肉色 -> 蓝灰（冷色=信息）
m = re.search(r'^\.about-updates > h2 \{[\s\S]*?\n\}', cs, re.M)
assert m, 'About h2 锚点异常'
ABOUT_H2 = """.about-updates > h2 {
  margin: 0; padding: 6px 10px; font-size: 11.5px; font-weight: 600; line-height: 1.25;
  /* 蓝灰＝信息类（冷色）。2026-10-20 指挥官采纳 C 方案：
     暖色只留给「要动手配」，红色只留给「危险操作」，此块回归白底、只标题带色。 */
  color: #1c232b; border-radius: 9px 9px 0 0;
  background: linear-gradient(150deg, #dde7f6, #cddcf0);
}"""
cs = cs[:m.start()] + ABOUT_H2 + cs[m.end():]

# 3) 旧注释里写着「协同规范=肉色、关于更新=蓝」已过时，纠正以免误导下一个改代码的人
old_cmt = """/* 折叠区暖色底（指挥官 2026-10-12 提议试效果）：
   连接设置=黄（可配置）、协同规范=肉色（约束/规矩）、关于更新=蓝（信息）。
   收起时只染标题行，展开后面板仍走玻璃层，避免整块过艳。 */"""
new_cmt = """/* 折叠区配色按语义分工（2026-10-20 指挥官采纳 C 方案）：
   连接设置=黄（要动手配，唯一暖色）｜协同规范=近白（只读，最淡）｜
   关于更新=蓝灰（信息，冷色）｜执行总开关=肉红（危险操作，唯一的红）。
   收起时只染标题行，展开后面板走玻璃层，避免整块过艳。 */"""
if old_cmt in cs:
    cs = cs.replace(old_cmt, new_cmt, 1)

io.open(C, 'w', encoding='utf-8').write(cs)
print('C 方案已落地：协同规范=近白、About=蓝灰、连接设置保持黄')