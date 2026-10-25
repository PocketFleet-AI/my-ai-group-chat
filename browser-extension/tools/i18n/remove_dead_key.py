"""删除死键 updateInstructions（2026-10-13 指挥官裁定：那句说明是给我们自己看的，用户不需要）。
只删这一键，其余一律保留。
"""
import io
import json
import os

KEY = "updateInstructions"
base = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_locales")
)

for loc in ["en", "zh_CN", "ja", "ko", "fr", "de", "es", "pt"]:
    path = os.path.join(base, loc, "messages.json")
    with io.open(path, encoding="utf-8") as f:
        data = json.load(f)
    if KEY in data:
        del data[KEY]
        with io.open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps({k: data[k] for k in sorted(data)}, ensure_ascii=False, indent=2) + "\n")
        print(loc, "已删除 ->", len(data), "keys")
    else:
        print(loc, "本无此键")