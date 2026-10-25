# -*- coding: utf-8 -*-
"""给 manifest.json 补上 web_accessible_resources（MV3 格式，2026-10-13 指挥官令）。

背景：浮层面板徽标改用真实品牌 logo（content.js 以 chrome.runtime.getURL 注入
chrome-extension:// 图片）。content script 注入进网页 DOM 的图片属于「网页可访问
资源」，MV3 必须显式声明 WAR，否则 Chrome 拒绝加载（面板徽标裂图）。

matches 从 content_scripts[0].matches 程序化提取（逐字复制，不做宽于注入面的声明），
插入后重新 parse JSON 自校验。幂等：已有 WAR 时只校验不重复插。
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MANIFEST = os.path.join(ROOT, "manifest.json")
RESOURCE = "icons/pocketfleet-24.png"


def main():
    with io.open(MANIFEST, "r", encoding="utf-8", newline="") as f:
        raw = f.read()
    manifest = json.loads(raw)

    matches = []
    for entry in manifest.get("content_scripts") or []:
        for m in entry.get("matches", []):
            if m not in matches:
                matches.append(m)
    assert matches, "FATAL: content_scripts matches empty"

    existing = manifest.get("web_accessible_resources")
    if existing:
        flat = [r for e in existing for r in e.get("resources", [])]
        assert RESOURCE in flat, f"WAR exists but missing {RESOURCE}"
        print("[SKIP] web_accessible_resources already present, verified")
        return 0

    indent = "  "
    lines = [f'{indent}"web_accessible_resources": [', f'{indent}  {{', f'{indent}    "resources": [']
    lines.append(f'{indent}      "{RESOURCE}"')
    lines.append(f'{indent}    ],')
    lines.append(f'{indent}    "matches": [')
    for i, m in enumerate(matches):
        comma = "," if i < len(matches) - 1 else ""
        lines.append(f'{indent}      "{m}"{comma}')
    lines.append(f'{indent}    ]')
    lines.append(f'{indent}  }}')
    lines.append(f'{indent}],')
    block = "\n".join(lines)

    anchor = f'{indent}"action": {{'
    assert raw.count(anchor) == 1, f"anchor [action] expected 1, got {raw.count(anchor)}"
    patched = raw.replace(anchor, block + "\n" + anchor)

    # 自校验：重新 parse，WAR 与 content_scripts 注入面逐字一致
    check = json.loads(patched)
    war = check["web_accessible_resources"]
    assert len(war) == 1 and war[0]["resources"] == [RESOURCE], "WAR resources mismatch"
    assert war[0]["matches"] == matches, "WAR matches must equal content_scripts matches"
    assert "seed_token.json" not in war[0]["resources"], "WAR must not expose seed_token.json"

    with io.open(MANIFEST, "w", encoding="utf-8", newline="") as f:
        f.write(patched)
    print(f"[OK] web_accessible_resources added: 1 resource x {len(matches)} match patterns")
    return 0


if __name__ == "__main__":
    sys.exit(main())
