"""CSS：给 .update-rows 的子项显式指定 grid-column。

背景（2026-10-13）：删掉插件行的更新按钮后，两行子元素数不再对称（3 vs 4），
grid 自动按行稀疏填充 —— 第 1 行只占满 3 列，第 2 行的第一个子项（Rules）被塞进
第 1 行第 4 列，于是两行内容挤成一行（实测截图证实）。

修法：给四类子项显式 grid-column。列已定死，grid 游标在第 1 行填满后
自然换行，第 2 行从第 1 列重新开始，恢复两行结构。
这是 display:contents 的第三个陷阱（见下方注释）。
"""
import io
import re

P = 'popup.css'
s = io.open(P, encoding='utf-8').read()


def replace_block(css, start_pat, new_block, label):
    m = re.search(start_pat, css, re.M)
    assert m, '起始锚点未找到：' + label
    i = m.end()
    depth = 1
    while depth:
        if css[i] == '{':
            depth += 1
        elif css[i] == '}':
            depth -= 1
        i += 1
    return css[:m.start()] + new_block + css[i:]


UPDATE_ROWS = """.update-rows {
  display: grid;
  /* 第一列必须定宽：display:contents 下 .update-name 的 white-space:nowrap
     会让 auto 轨道吞掉全部剩余空间，导致第2/3 列被压成 0（值看不见）。
     定宽后长文案靠 ellipsis 省略，两行仍严格对齐。 */
  grid-template-columns: 72px minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 6px;
  font-size: 10.5px;
  line-height: 1.3;
}
/* 两行子元素数不对称（插件行 3 项 / 规则行 4 项）时，grid 自动填充会把规则行的
   首项塞进第 1 行末列，两行内容挤成一行。必须显式定列，游标填满第 1 行后才会换行。 */
.update-row > .update-name { grid-column: 1; }
.update-row > .update-cur { grid-column: 2; }
.update-row > .update-latest { grid-column: 3; }
.update-row > .btn.update-btn { grid-column: 4; }"""

s = replace_block(s, r'^\.update-rows\s*\{', UPDATE_ROWS, '.update-rows')

io.open(P, 'w', encoding='utf-8').write(s)
print('CSS 已改：四类子项显式 grid-column，恢复两行结构')