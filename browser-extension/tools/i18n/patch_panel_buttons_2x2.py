#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""浮层面板按钮布局：四钮 2×2 全等宽（指挥官 2026-10-14 拍板）。

改动：
  ① content.css：删掉「主按钮 flex:1 1 auto / 说明钮 flex:0 0 auto」两条覆盖，
     让 .bridge-actions-row > button 的 flex:1 1 0 直接生效——两行各两钮均分；
  ② content.js PANEL_I18N：es/pt 的 panelRecheck 缩短（等宽列文字预算约 98px，
     "Volver a comprobar"/"Verificar novamente" 约 104px 会溢出按钮；
     nowrap + 面板 overflow:hidden 下会被裁切）：
        es: Volver a comprobar → Revisar
        pt: Verificar novamente → Verificar
CRLF 归一化 + 锚点计数断言 + 旧值清零断言。
"""
import os
import sys

raise SystemExit("Retired after content split. Edit content_i18n.js/content.css and run tools/build-content.cjs.")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSS = os.path.join(ROOT, "browser-extension", "content.css")
JS = os.path.join(ROOT, "browser-extension", "content.js")

EDITS = {
    CSS: [
        (
            "/* 主按钮与「协同说明」并排：主按钮弹性放大吃剩余宽度，说明钮按内容收缩\n"
            "   （特异性须高于 .bridge-actions-row > button 的 flex:1 1 0） */\n"
            "#folded-host-bridge-panel .bridge-actions-row > .bridge-primary { flex: 1 1 auto; }\n"
            "#folded-host-bridge-panel .bridge-actions-row > .bridge-instr { flex: 0 0 auto; }\n",
            "/* 四钮 2×2 全等宽（2026-10-14 指挥官拍板）：主按钮不再弹性放大、说明钮不再按内容收缩，\n"
            "   各行两个按钮均分（.bridge-actions-row > button 的 flex:1 1 0 直接生效）。 */\n",
            1,
        ),
    ],
    JS: [
        ('    panelRecheck: "Volver a comprobar",', '    panelRecheck: "Revisar",', 1),
        ('    panelRecheck: "Verificar novamente",', '    panelRecheck: "Verificar",', 1),
    ],
}


def main():
    for path, edits in EDITS.items():
        with open(path, "r", encoding="utf-8", newline="") as f:
            raw = f.read()
        crlf = "\r\n" in raw
        text = raw.replace("\r\n", "\n")
        for old, new, expect in edits:
            n = text.count(old)
            if n != expect:
                print("[FAIL] %s anchor count=%d (expect %d):\n%s" % (os.path.basename(path), n, expect, old[:160]))
                sys.exit(1)
            text = text.replace(old, new)
        out = text.replace("\n", "\r\n") if crlf else text
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(out)
        print("[OK] %s patched (%d edits)" % (os.path.basename(path), len(edits)))

    # 旧值清零
    with open(CSS, "r", encoding="utf-8", newline="") as f:
        css = f.read()
    for gone in (".bridge-primary { flex: 1 1 auto; }", ".bridge-instr { flex: 0 0 auto; }"):
        if gone in css:
            print("[FAIL] stale css remains: %s" % gone)
            sys.exit(1)
    with open(JS, "r", encoding="utf-8", newline="") as f:
        js = f.read()
    for gone in ("Volver a comprobar", "Verificar novamente"):
        if gone in js:
            print("[FAIL] stale translation remains: %s" % gone)
            sys.exit(1)
    for want in ("panelRecheck: \"Revisar\"", "panelRecheck: \"Verificar\""):
        if want not in js:
            print("[FAIL] missing: %s" % want)
            sys.exit(1)
    print("[OK] stale checks passed")


if __name__ == "__main__":
    main()
