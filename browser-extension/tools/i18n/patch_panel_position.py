#!/usr/bin/env python3
"""浮层面板定位：顶部固定 → 垂直居中（指挥官 2026-10-14 令）。

原 top:96px 与大量插件默认聚集的右上角重叠，改为 top:50% + translateY(-50%)。
四处联动，缺一不可：
  ① 基础规则 top:96px → top:50%，补 transform: translateY(-50%)；
  ② 入场动画关键帧必须同步带 -50% —— animation-fill-mode: both 会用 to 关键帧的
     transform 覆盖静态值，只改①不改②会在动画结束后跳回未居中位（经典陷阱）；
  ③ 收起态补 translateY(-50%) !important —— 收起态 animation:none，
     不补则竖条顶边贴视口中线而非居中；
  ④ ≤720px 媒体查询删掉 top:72px 覆盖 —— 居中与视口高度无关，
     保留覆盖等于小屏回退到顶部聚集区。
CRLF 归一化 + 锚点唯一性断言 + 旧值清零断言。
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSS = os.path.join(ROOT, "browser-extension", "content.css")


def main():
    with open(CSS, "r", encoding="utf-8", newline="") as f:
        raw = f.read()
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    edits = [
        # ① 基础定位：顶部 → 垂直居中
        (
            "  top: 96px;\n  right: 20px;\n",
            "  top: 50%;\n  right: 20px;\n"
            "  /* 垂直居中（2026-10-14 指挥官令）：避开各插件默认聚集的顶部区域 */\n"
            "  transform: translateY(-50%);\n",
        ),
        # ② 入场动画关键帧同步 -50%（fill-mode:both 覆盖陷阱）
        (
            "@keyframes bridge-panel-in {\n"
            "  from { opacity: 0; transform: translateX(14px); }\n"
            "  to { opacity: 1; transform: none; }\n"
            "}",
            "@keyframes bridge-panel-in {\n"
            "  /* to 必须停在 translateY(-50%)：fill-mode:both 会用末关键帧覆盖静态\n"
            "     transform，写 none 会让面板动画结束后跳回 top:50% 未居中位 */\n"
            "  from { opacity: 0; transform: translate(14px, calc(-50% + 14px)); }\n"
            "  to { opacity: 1; transform: translateY(-50%); }\n"
            "}",
        ),
        # ③ 收起态同步居中（animation:none，静态 transform 不生效则靠 !important）
        (
            '#folded-host-bridge-panel[data-collapsed="true"] {\n  right: 0 !important;\n',
            '#folded-host-bridge-panel[data-collapsed="true"] {\n  right: 0 !important;\n'
            "  transform: translateY(-50%) !important;\n",
        ),
        # ④ 小屏媒体查询去顶部覆盖
        (
            "@media (max-width: 720px) {\n  #folded-host-bridge-panel {\n    top: 72px;\n    right: 8px;\n  }\n}",
            "@media (max-width: 720px) {\n  #folded-host-bridge-panel {\n    right: 8px;\n  }\n}",
        ),
        # ⑤ 文件头契约注释补定位说明
        (
            "   data-activity / data-control(-label) / data-retry / data-state / data-collapsed。 */",
            "   data-activity / data-control(-label) / data-retry / data-state / data-collapsed。\n"
            "   定位（2026-10-14）：top:50% + translateY(-50%) 垂直居中，收起态同步；\n"
            "   入场动画关键帧须带 -50%（fill-mode:both 覆盖陷阱）。 */",
        ),
    ]

    for old, new in edits:
        n = text.count(old)
        if n != 1:
            print("[FAIL] anchor count=%d (expect 1):\n%s" % (n, old[:160]))
            sys.exit(1)
        text = text.replace(old, new)

    for gone in ("top: 96px;", "top: 72px;", "transform: translateX(14px)", "to { opacity: 1; transform: none; }"):
        if gone in text:
            print("[FAIL] stale value remains: %s" % gone)
            sys.exit(1)
    for want in ("top: 50%;", "transform: translateY(-50%);", "translate(14px, calc(-50% + 14px))"):
        if want not in text:
            print("[FAIL] missing: %s" % want)
            sys.exit(1)

    out = text.replace("\n", "\r\n") if crlf else text
    with open(CSS, "w", encoding="utf-8", newline="") as f:
        f.write(out)
    print("[OK] content.css patched: vertical centering (5 edits)")


if __name__ == "__main__":
    main()
