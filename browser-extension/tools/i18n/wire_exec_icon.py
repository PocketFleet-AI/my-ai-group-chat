"""popup.js：在三个状态切换点调用 setExecutionIcon。

三个点：
  1. renderExecutionControl(killSwitchActive) —— 已暂停 → resume 图标；未暂停 → pause 图标
  2. applyOfflineView()—— 离线禁用，回落 pause 图标
  3. 初始「Checking…」态由 HTML 里的省略号图标承担，无需额外设置
"""
import io

P = 'popup.js'
s = io.open(P, encoding='utf-8').read()

edits = [
    # 1) 正常渲染
    ("""  executionControlLabel.textContent = killSwitchActive ? t("resume", "Resume") : t("pause", "Pause");""",
     """  executionControlLabel.textContent = killSwitchActive ? t("resume", "Resume") : t("pause", "Pause");
  setExecutionIcon(killSwitchActive ? "resume" : "pause");"""),
    # 2) 离线态
    ("""  executionControlLabel.textContent = t("pause", "Pause");
  killSwitchHint.textContent = t("killSwitchOffline", "连接后可用");""",
     """  executionControlLabel.textContent = t("pause", "Pause");
  setExecutionIcon("pause");
  killSwitchHint.textContent = t("killSwitchOffline", "连接后可用");"""),
]

for old, new in edits:
    assert old in s, '锚点未找到：\n' + old[:60]
    assert s.count(old) == 1, '锚点不唯一'
    s = s.replace(old, new, 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('popup.js 已在2 个状态点接上 setExecutionIcon')