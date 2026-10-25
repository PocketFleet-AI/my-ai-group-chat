# -*- coding: utf-8 -*-
"""content.css v4 补丁（2026-10-13 指挥官令，配合 patch_panel_layout_logo.py）：
① 徽标：蓝渐变「PF」文字方块 → 真实 logo 图片（圆形徽章，不加圆角/底色/阴影）。
② 动作区：主按钮移入 flex 行与「协同说明」并排 —— 主按钮弹性放大、说明钮按内容收缩；
   移除 width:100%（已被 flex 行布局取代）。
③ 删除 .bridge-quiet（底部静默行已并入主行，模板中不再存在该 class）。
纪律：CRLF 归一化 + 锚点唯一性断言。
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSS = os.path.join(ROOT, "content.css")


def replace_once(text, old, new, label):
    n = text.count(old)
    assert n == 1, f"anchor [{label}] expected 1 occurrence, got {n}"
    return text.replace(old, new)


def main():
    with io.open(CSS, "r", encoding="utf-8", newline="") as f:
        raw = f.read()
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    # ① 徽标改为真实 logo 图片
    old_mark = """/* 徽标：蓝色渐变方块 + 白字 PF（呼应品牌 logo 的蓝方底；
   不使用真实图片——manifest 未声明 web_accessible_resources，
   且 build_cws_package.py 会剥掉它，CWS 版会静默失效）。 */
#folded-host-bridge-panel .bridge-mark {
  position: relative;
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(150deg, #3b7ff0, #1f5fd4);
  color: #fff;
  box-shadow: 0 2px 6px rgba(31, 95, 212, 0.25);
  font: 800 10.5px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  letter-spacing: 0.02em;
}"""
    new_mark = """/* 徽标：真实品牌 logo（chrome-extension:// 资源，src 由 panel() 运行时注入，
   manifest 已声明 web_accessible_resources）。原图为圆形徽章 —— 不加圆角/底色/
   阴影，原样呈现（与弹窗/接力页同一规则）。 */
#folded-host-bridge-panel .bridge-mark {
  position: relative;
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
}
#folded-host-bridge-panel .bridge-mark .bridge-logo {
  width: 22px;
  height: 22px;
  display: block;
}"""
    text = replace_once(text, old_mark, new_mark, "mark")

    # ② 主按钮：退出全宽单列，改弹性行内项；与说明钮的宽度分配规则
    old_primary = """#folded-host-bridge-panel button.bridge-primary {
  width: 100%;
  height: 34px;"""
    new_primary = """#folded-host-bridge-panel button.bridge-primary {
  height: 34px;"""
    text = replace_once(text, old_primary, new_primary, "primary-width")

    old_hover = """#folded-host-bridge-panel button.bridge-primary:hover {
  filter: brightness(1.05);
}"""
    new_hover = """#folded-host-bridge-panel button.bridge-primary:hover {
  filter: brightness(1.05);
}
/* 主按钮与「协同说明」并排：主按钮弹性放大吃剩余宽度，说明钮按内容收缩
   （特异性须高于 .bridge-actions-row > button 的 flex:1 1 0） */
#folded-host-bridge-panel .bridge-actions-row > .bridge-primary { flex: 1 1 auto; }
#folded-host-bridge-panel .bridge-actions-row > .bridge-instr { flex: 0 0 auto; }"""
    text = replace_once(text, old_hover, new_hover, "primary-flex")

    # ③ 删除 bridge-quiet（模板已无该 class）
    old_quiet = """/* 低频说明行：最静的一档 */
#folded-host-bridge-panel button.bridge-quiet {
  width: 100%;
  height: 28px;
  border-color: transparent;
  background: transparent;
  color: #6d7ea6;
  font-size: 10.5px;
  font-weight: 600;
}
#folded-host-bridge-panel button.bridge-quiet:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #1848a3;
}

"""
    assert text.count(old_quiet) == 1, f"anchor [quiet] expected 1, got {text.count(old_quiet)}"
    text = text.replace(old_quiet, "")

    if crlf:
        text = text.replace("\n", "\r\n")
    with io.open(CSS, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print("[OK] content.css patched: mark-logo / primary-flex / quiet-removed")


if __name__ == "__main__":
    sys.exit(main())
