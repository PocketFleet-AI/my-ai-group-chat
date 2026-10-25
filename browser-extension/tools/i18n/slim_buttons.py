"""CSS：按钮瘦身 + 与熔断按钮同宽。

做法：按短锚点定位起始行，再按 CSS 花括号配平取出整块替换。
（多行字面量锚点在本仓反复匹配失败——改用结构化定位，不再依赖长字符串相等。）
纪律：改本仓文件用 io.open(p, encoding='utf-8') 读写，让 Python 处理 CRLF。
"""
import io
import re

P = 'popup.css'
s = io.open(P, encoding='utf-8').read()


def replace_block(css, start_pat, new_block, label):
    """按正则定位规则起始处，向后扫描到配平的右花括号，整块替换。"""
    m = re.search(start_pat, css, re.M)
    assert m, '起始锚点未找到：' + label
    i = m.end()          # 正则吃掉 '{'，从其后开始扫描
    depth = 1
    while depth:
        ch = css[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        i += 1
    return css[:m.start()] + new_block + css[i:], i - m.start()


UPDATE_BTN = """.btn.update-btn {
  /* 权重须高于 .btn：.btn 定义在本块之后，同权重会覆盖 padding，
     导致 min-height 从未生效（实测高度一直是 30px）。 */
  color: var(--blue);
  border-color: rgba(31, 95, 212, .3);
  background: linear-gradient(150deg, #fff, var(--tint));
  /* 与下方熔断按钮（Pause/Resume）同宽，两处视觉对齐 */
  min-width: 76px;
  padding: 0 8px;
  min-height: 22px;
  font-size: 10.5px;
  line-height: 1;
  gap: 3px;
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
}"""

EXEC_BTN = """.card.sw > .btn {
  flex: 0 0 auto; white-space: nowrap; max-width: 46%;
  /* 与 .update-btn 同宽，两处视觉对齐 */
  min-width: 76px; padding: 0 8px; min-height: 22px; line-height: 1; gap: 3px;
}"""

s, n1 = replace_block(s, r'^\.update-btn\s*\{', UPDATE_BTN, '.update-btn')
s, n2 = replace_block(s, r'^\.card\.sw > \.btn\s*\{', EXEC_BTN, '.card.sw > .btn')

io.open(P, 'w', encoding='utf-8').write(s)
print('CSS 已改：.update-btn 替换 %d 字符，.card.sw>.btn 替换 %d 字符' % (n1, n2))