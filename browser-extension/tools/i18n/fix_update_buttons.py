"""HTML：删插件行按钮、给规则更新按钮加 SVG 图标、给熔断按钮图标加 id。
2026-10-13 指挥官定：插件行不给按钮（商店自动更新/本地手动替换，按了没用）。
"""
import io

P = 'popup.html'
s = io.open(P, encoding='utf-8').read()

edits = []

# 1) 插件行：删按钮。插件版本的「最新版本」改由弹窗打开时自动检查填充，
#    不再需要手动入口——否则这一列会永远停在「未检查」，成为死列。
edits.append((
    """              <span class="update-latest" id="latestExtVersion">—</span>
              <button id="checkExtensionUpdate" class="btn sm update-btn" type="button" data-i18n="update">更新</button>""",
    """              <span class="update-latest" id="latestExtVersion">—</span>""",
))

# 2) 规则更新按钮：加 SVG 图标（下载到托盘），文字包进 span 便于 i18n 局部替换
edits.append((
    """              <button id="checkRuleUpdate" class="btn sm update-btn" type="button" data-i18n="update">更新</button>""",
    """              <button id="checkRuleUpdate" class="btn sm update-btn" type="button">
                <svg class="btn-ico" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M11 3h2v8.6l2.9-2.9 1.4 1.4-5.3 5.3-5.3-5.3 1.4-1.4L11 11.6z"></path><rect x="4" y="18.2" width="16" height="2.2" rx="1.1"></rect></svg>
                <span data-i18n="update">更新</span>
              </button>""",
))

# 3) 熔断按钮图标加 id：状态切换时换形状（省略号/暂停/播放），原来只有文案变
edits.append((
    """          <svg class="btn-ico" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><rect x="6.6" y="5.4" width="3.6" height="13.2" rx="1.2"></rect><rect x="13.8" y="5.4" width="3.6" height="13.2" rx="1.2"></rect></svg>""",
    """          <svg id="executionControlIco" class="btn-ico" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><circle cx="5.4" cy="12" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="18.6" cy="12" r="1.7"></circle></svg>""",
))

for old, new in edits:
    assert old in s, '锚点未找到：\n' + old[:70]
    assert s.count(old) == 1, '锚点不唯一：' + old[:70]
    s = s.replace(old, new, 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('HTML 已改：删插件按钮 + 规则按钮加图标 + 熔断图标改省略号并加 id')