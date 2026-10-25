"""重写「版本与更新」区：两行正确包进共享的 .update-rows 容器。
上一次包装错位（第二行落到容器外），本次按行号切片重写整块，不做脆弱的字符串替换。
"""
import io

P = "D:/workSpace/PocketFleetV2/browser-extension/popup.html"
lines = io.open(P, encoding="utf-8").read().split("\n")

# 定位「关于与更新」注释块到 fold-copy 说明行之间的全部内容
start = None
end = None
for i, l in enumerate(lines):
    if "版本与更新" in l and start is None:
        start = i
    if start is not None and 'id="updateInstructions"' in l:
        end = i
        break

assert start is not None and end is not None, "未定位到区块"

NEW = '''          <!-- 版本与更新：两组同构的横向条目，每组 4 列（名称 / 当前 / 最新 / 更新）。
               两行共享同一个 .update-rows grid（靠 display:contents 把子元素提升为
               父级 grid item），否则各行独立成 grid 时第一列宽度按自身内容计算，
               英文下 Extension / Rules 长度不同必然左右错位。
               核心 ID 全部保留，popup.js 无需改动。 -->
          <div class="update-rows">
            <div class="update-row">
              <span class="update-name" data-i18n="pluginVersionName">插件版本</span>
              <b class="update-cur" id="aboutExtVersion">—</b>
              <span class="update-latest" id="latestExtVersion">—</span>
              <button id="checkExtensionUpdate" class="btn sm update-btn" type="button" data-i18n="update">更新</button>
            </div>
            <div class="update-row">
              <span class="update-name" data-i18n="ruleVersionName">规则版本</span>
              <b class="update-cur" id="currentRuleVersion">—</b>
              <span class="update-latest" id="latestRuleVersion">—</span>
              <button id="checkRuleUpdate" class="btn sm update-btn" type="button" data-i18n="update">更新</button>
            </div>
            <p class="fold-copy" data-i18n="updateInstructions">Store extensions update through the browser. Local builds require manual replacement. Verified rules apply when pages are idle.</p>'''

out = lines[:start] + NEW.split("\n") + lines[end + 1:]
io.open(P, "w", encoding="utf-8").write("\n".join(out))
print("重写完成：第 %d-%d 行" % (start + 1, end + 1))