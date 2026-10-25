"""popup.js：把「插件更新按钮」改为「打开弹窗时自动检查一次」。

理由（指挥官 2026-10-13）：商店版插件更新由浏览器自动完成、本地版只能手动替换文件，
手动按钮在两种形态下都装不上，属于死按钮。但「最新版本」这一列不能留成永远「未检查」的死列，
所以把点击触发改为打开弹窗时静默检查一次——用户仍能看到有没有新版，只是没有多余按钮。

做法：按行号区间替换，不用正则跨行匹配。
     （今天在同一处栽了三次：`.` 不跨行、CRLF、`.` 贪婪吞掉文件头——行号最可靠。）
纪律：改本仓文件用 io.open(p, encoding='utf-8') 读写，让 Python 处理 CRLF。
"""
import io

P = 'popup.js'
lines = io.open(P, encoding='utf-8').read().split('\n')

# 行号来自实测：319 行是 '/**'，325 行是 addEventListener，363 行是 '});'
# 0-based切片：[318:363]覆盖 319..363
START, END = 318, 363
assert lines[START] == '/**', '起始行不符：' + lines[START]
assert 'checkExtensionUpdate' in lines[START + 6], 'addEventListener 行号偏移'
assert lines[END - 1] == '});', '结束行不符：' + lines[END - 1]

NEW = """/**
 * 插件程序更新检查：商店安装版由 Chrome 自更新机制处理，本地内测版（unpacked）无法自更新。
 * 2026-10-13 指挥官定：不做手动按钮（两种形态下都装不上，属死按钮），
 * 改为打开弹窗时静默检查一次，让「最新版本」列有真实内容。
 */
async function checkExtensionUpdateOnce() {
  try {
    const version = chrome.runtime.getManifest().version;
    document.querySelector("#aboutExtVersion").textContent = `v${version}`;
    const requestUpdateCheck = chrome.runtime.requestUpdateCheck;
    if (typeof requestUpdateCheck !== "function") {
      extensionUpdateState = { key: "updateUnknown" };
      renderUpdateVersions();
      return;
    }
    const result = await requestUpdateCheck.call(chrome.runtime);
    // UpdateCheckDetails.status: no_update | update_available | throttled
    const status = result && result.status;
    if (status === "update_available") {
      extensionUpdateState = result.version ? { version: "v" + result.version } : { key: "extUpdateAvailable" };
    } else if (status === "throttled") {
      extensionUpdateState = { key: "extUpdateThrottled" };
    } else if (status === "no_update") {
      extensionUpdateState = { key: "updateNoNewVersion" };
    } else {
      extensionUpdateState = { key: "updateUnknown" };
    }
  } catch {
    extensionUpdateState = { key: "updateCheckFailed" };
  }
  renderUpdateVersions();
}""".split('\n')

out = lines[:START] + NEW + lines[END:]

# 在令牌显隐分节之前调用一次
s = '\n'.join(out)
anchor = '/* ---------------- 令牌显隐 ---------------- */'
assert s.count(anchor) == 1, '初始化锚点不唯一'
s = s.replace(anchor, 'checkExtensionUpdateOnce();\n\n' + anchor, 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('popup.js：手动按钮 → 打开弹窗自动检查一次（原 %d 行 → 现 %d 行）'
      % (len(lines), len(s.split('\n'))))