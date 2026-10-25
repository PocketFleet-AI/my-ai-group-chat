"""卡片配色：标题栏更深、内容区更浅、文字保持黑（指挥官 2026-10-13 定）。
单文件一次性写入，避免同文件并发覆盖。"""
import io

P = 'popup.css'
s = io.open(P, encoding='utf-8').read()

edits = [
    # 1) 标题栏：加深（原来是 #f7d9d0→#f2c4b8，接近内容区，看不出层次）
    ("""  color: #1c232b; border-radius: 9px 9px 0 0;
  background: linear-gradient(150deg, #f7d9d0, #f2c4b8);""",
     """  color: #1c232b; border-radius: 9px 9px 0 0;
  /* 标题栏比内容区更深一档，形成层次；文字仍为黑色（指挥官定） */
  background: linear-gradient(150deg, #efb8a4, #e29c86);"""),
    # 2) 内容区：更浅（原来是 --rose-bg #fdeae5 的一半，没拉开对比）
    (""".fold.tint-rose > summary {
  background: linear-gradient(150deg, rgba(255, 240, 235, .95), var(--rose-bg));
  border-radius: 9px;
  color: var(--rose);
}""",
     """.fold.tint-rose > summary {
  background: linear-gradient(150deg, rgba(255, 240, 235, .95), var(--rose-bg));
  border-radius: 9px;
  color: var(--rose);
}
/* 「关于与更新」内容区：比标题栏明显更浅的一套肉色（--rose-bg 提亮） */
.about-updates > .inbody {
  background: linear-gradient(180deg, #fdf1ed, #fbe4dc);
}"""),
]

for old, new in edits:
    assert old in s, '锚点未找到：\n' + old[:60]
    assert s.count(old) == 1, '锚点不唯一：' + old[:60]
    s = s.replace(old, new, 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('卡片配色已改：标题栏加深 #efb8a4→#e29c86，内容区提亮 #fdf1ed→#fbe4dc')