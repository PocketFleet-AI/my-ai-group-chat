# -*- coding: utf-8 -*-
"""浮层面板轮询节流（指挥官 2026-10-14：离线态连续刷新，扰用户在输入框调光标）。

五处联动改 browser-extension/content.js：
  ① refreshStatus 重写：静默轮询（稳态不闪「检测中」）+ 离线指数退避
     5s→10s→20s→40s→60s 封顶（成功即复位）+ 在途防叠加 + 自调度轮询链；
  ② bootstrap：两个前导心跳改 silent；删固定 5s interval（改由 ① 自调度）；
  ③ deactivateBridgeInstance：清理 statusPollTimer；
  ④ handlePageMutation(records)：面板自身重渲不触发全页扫描（断自激）；
  ⑤ module.exports：补测试钩子（refreshStatus/handlePageMutation/panelConnection/
     statusPollDelay/pageScanPending/clearRouteBaselineForTest）。

模式：CRLF 归一化读入 + 锚点唯一性断言 + 旧值清零断言 + 写完复校 CRLF。
"""
import os
import sys

raise SystemExit("Retired after content split. Protected runtime changes require approval; see CONTENT_MODULES.md.")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CONTENT = os.path.join(ROOT, "browser-extension", "content.js")


def read_normalized(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()  # universal newlines: CRLF -> LF


def write_crlf(path, text):
    # 写回时按 Windows 文本模式把 LF 翻译回 CRLF（文件为纯 CRLF）
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def replace_once(src, old, new, label):
    n = src.count(old)
    assert n == 1, "锚点 %s 命中 %d 次（要求唯一）" % (label, n)
    return src.replace(old, new)


NEW_REFRESH = '''/** 状态轮询节流（指挥官 2026-10-14：离线态连续刷新扰输入框光标）。
 *  ① 后台轮询 silent：已有确定态时保持显示、结果落地才更新 ⇒ 稳态零 DOM 写入，面板不闪跳；
 *  ② 离线指数退避 5s→10s→20s→40s→60s 封顶，恢复即复位；窗口聚焦/可见性变化仍即时刷新；
 *  ③ 在途防叠加：挂起请求期间静默轮询直接让位（防慢请求堆积与状态乱序）；
 *  ④ 轮询链由本函数 finally 自调度，取代固定 5s interval。 */
const STATUS_POLL_BASE_MS = 5000;
const STATUS_POLL_MAX_MS = 60000;
let statusPollFailures = 0;
let statusPollInFlight = false;
let statusPollTimer = null;

function nextStatusPollDelay() {
  return Math.min(STATUS_POLL_BASE_MS * Math.pow(2, statusPollFailures), STATUS_POLL_MAX_MS);
}

function scheduleStatusPoll(delayMs) {
  if (statusPollTimer) clearTimeout(statusPollTimer);
  statusPollTimer = setTimeout(() => {
    statusPollTimer = null;
    if (retireIfSuperseded()) return;
    refreshStatus({ silent: true });
  }, delayMs);
}

async function refreshStatus(options = {}) {
  const silent = options.silent === true;
  if (silent && statusPollInFlight) {
    // 让位在途请求（其 finally 会续链），此处补排一次保证链路不断
    scheduleStatusPoll(nextStatusPollDelay());
    return;
  }
  statusPollInFlight = true;
  // 仅「尚无确定态」或用户主动触发才闪「检测中」；静默轮询保持上态显示，
  // 杜绝旧行为每 5 秒「检测中→离线」两态翻飞（面板抖动 + 全页 DOM 写入）
  if (!silent || connectionKey === "panelChecking") setConnectionKey("panelChecking", "checking");
  try {
    const current = await send({ type: "bridge-status" });
    killSwitchActive = current.kill_switch_active;
    statusPollFailures = 0;
    if (current.kill_switch_active) {
      setConnectionKey("panelPaused", "warning");
    } else {
      setConnectionKey("panelConnected", "connected");
    }
  } catch (error) {
    killSwitchActive = null;
    statusPollFailures = Math.min(statusPollFailures + 1, 10);
    let msg = error.message || String(error);
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = panelT("panelBridgeOffline");
    }
    setConnectionKey("panelDisconnected", "disconnected", msg);
  } finally {
    statusPollInFlight = false;
    if (!retireIfSuperseded()) scheduleStatusPoll(nextStatusPollDelay());
  }
}'''


def main():
    src = read_normalized(CONTENT)

    # ① refreshStatus 整块替换（按函数边界定位，避免长字面量锚点转录风险）
    start = src.index("async function refreshStatus() {")
    end = src.index("\n}\n", start) + len("\n}\n")
    old_block = src[start:end]
    assert old_block.count("setConnectionKey") == 4, "旧 refreshStatus 结构异常"
    src = src[:start] + NEW_REFRESH + src[end:]

    # ② bootstrap：首发注释 + 前导心跳 silent + 删固定 interval
    src = replace_once(
        src,
        "  refreshStatus();\n  // 快速前导心跳补偿（注入 600ms 与 2000ms 各补发一次），杜绝首发网络等待与 SPA 水合期静默\n"
        "  setTimeout(() => { if (!retireIfSuperseded()) refreshStatus(); }, 600);\n"
        "  setTimeout(() => { if (!retireIfSuperseded()) refreshStatus(); }, 2000);\n",
        "  refreshStatus(); // 首发即显示「检测中」，并自此接管轮询链（自带离线退避调度）\n"
        "  // 快速前导心跳补偿（注入 600ms 与 2000ms 各补发一次）：silent 不闪态，仅在首发未回或状态已变时落地\n"
        "  setTimeout(() => { if (!retireIfSuperseded()) refreshStatus({ silent: true }); }, 600);\n"
        "  setTimeout(() => { if (!retireIfSuperseded()) refreshStatus({ silent: true }); }, 2000);\n",
        "bootstrap-beats",
    )
    src = replace_once(
        src,
        "  schedule(refreshStatus, 5000);\n  schedule(runPageScan, 3000);\n",
        "  // refreshStatus 的轮询链改由自身 finally 自调度（离线指数退避 5s→60s 封顶），不再挂固定 5s interval\n"
        "  schedule(runPageScan, 3000);\n",
        "schedule-interval",
    )

    # ③ 退役清理补 statusPollTimer
    src = replace_once(
        src,
        "  if (pageScanTimer) clearTimeout(pageScanTimer);\n  if (routeBaselineTimer) clearTimeout(routeBaselineTimer);\n",
        "  if (pageScanTimer) clearTimeout(pageScanTimer);\n"
        "  if (statusPollTimer) clearTimeout(statusPollTimer);\n"
        "  statusPollTimer = null;\n"
        "  if (routeBaselineTimer) clearTimeout(routeBaselineTimer);\n",
        "deactivate-cleanup",
    )

    # ④ handlePageMutation 收 records 并过滤面板自身变动
    src = replace_once(
        src,
        "function handlePageMutation() {\n  if (retireIfSuperseded()) return;\n  if (syncPageRoute()) {\n",
        "function handlePageMutation(records) {\n"
        "  if (retireIfSuperseded()) return;\n"
        "  // 面板自身重渲（连接态/活动文字）不视为页面变动：否则每轮状态写入都会喂给全页\n"
        "  // MutationObserver 触发扫描，形成自激；批次里出现面板之外的变动才排扫描\n"
        "  const panelRoot = typeof document !== \"undefined\" && document.getElementById(PANEL_ID);\n"
        "  if (panelRoot && typeof panelRoot.contains === \"function\" && records && records.length\n"
        "      && records.every((record) => panelRoot.contains(record.target))) {\n"
        "    return;\n"
        "  }\n"
        "  if (syncPageRoute()) {\n",
        "handlePageMutation",
    )

    # ⑤ 测试钩子
    src = replace_once(
        src,
        "    retireIfSuperseded,\n    panel,\n    ownsPanel,\n    isSupersededByOtherInstance,\n    CONTENT_INSTANCE_ID,\n",
        "    retireIfSuperseded,\n    panel,\n    ownsPanel,\n    isSupersededByOtherInstance,\n"
        "    refreshStatus,\n    handlePageMutation,\n"
        "    panelConnection: () => ({ key: connectionKey, state: connectionState, detail: connectionDetail }),\n"
        "    statusPollDelay: nextStatusPollDelay,\n"
        "    pageScanPending: () => pageScanTimer !== null,\n"
        "    clearRouteBaselineForTest: () => { routeBaselinePending = false; },\n"
        "    CONTENT_INSTANCE_ID,\n",
        "exports",
    )

    # 旧值清零断言（新代码里不得残留旧形态）
    for gone in (
        "async function refreshStatus() {\n  setConnectionKey(\"panelChecking\", \"checking\");\n",
        "schedule(refreshStatus, 5000);",
        "function handlePageMutation() {",
        "if (!retireIfSuperseded()) refreshStatus(); }, 600);",
        "if (!retireIfSuperseded()) refreshStatus(); }, 2000);",
    ):
        assert src.count(gone) == 0, "旧形态未清零: %r" % gone[:60]

    # 新形态就位断言
    for present in (
        "async function refreshStatus(options = {}) {",
        "if (silent && statusPollInFlight) {",
        "function nextStatusPollDelay() {",
        "function scheduleStatusPoll(delayMs) {",
        "function handlePageMutation(records) {",
        "statusPollDelay: nextStatusPollDelay,",
        "clearRouteBaselineForTest:",
    ):
        assert src.count(present) == 1, "新形态缺失或重复: %r" % present[:60]

    write_crlf(CONTENT, src)

    # 复校：纯 CRLF 保持
    raw = open(CONTENT, "rb").read().decode("utf-8")
    crlf = raw.count("\r\n")
    lf_only = len([i for i, ch in enumerate(raw) if ch == "\n" and (i == 0 or raw[i - 1] != "\r")])
    assert lf_only == 0, "出现 LF-only 行尾 %d 处" % lf_only
    print("OK: 5 处联动改完成；CRLF=%d，LF-only=0" % crlf)


if __name__ == "__main__":
    sys.exit(main())
