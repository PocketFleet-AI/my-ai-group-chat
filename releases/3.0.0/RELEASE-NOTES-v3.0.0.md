# My AI Group Chat 3.0.0 — Release Notes 草稿（待指挥官审定后粘贴）

> ⚠ 草稿状态：资产哈希为当前构建值，**重构建后须以最终产物刷新**（exe 尚不含 gloss 皮肤与 21:1x 施工，VM 前会再构建一次）。

---

## [EN]

### My AI Group Chat 3.0.0 — Bring Your Existing AIs Together

Orchestrate the AIs you already use — ChatGPT, Claude, Gemini, DeepSeek, and your local code agents — into one meeting group. Your Windows machine hosts the fleet; Telegram is your remote console.

**Highlights**
- **3-step wizard**: create your Telegram bot & group → connect your AIs → start the council.
- **Free forever, 2 seats** — no plugin required, no credit card, no time limit.
- **Paid tiers** (same binary, concurrent-seat count only): Solo 4 seats $19.99 · Team 6 seats $39.99 · Ultra 12 seats $79.99 — each a single 12-month payment, no auto-renewal.
- **BYOS (Bring Your Own Sessions)**: reuses your existing logged-in browser AI sessions and local code agents — no API keys needed for browser AIs, no retraining, your preferences stay yours.
- **AI-orchestrates-AI**: assign a host AI to dispatch tasks, request peer reviews, and aggregate results.
- **Open-source extension** (Apache-2.0) for full security auditing.

**Privacy in plain words**
- Orchestration control-flow runs over local loopback `127.0.0.1:18765`; no PocketFleet-operated central proxy.
- Content flows to third parties you choose: your Telegram group and your AI providers. The open-source extension fetches signed DOM-locator rules from a Cloudflare Worker (connection metadata only, no conversation payload) to keep up with AI site UI changes.
- Early preview: 30-day Solo 4-seat experience keys are distributed by contacting the author or joining the early-access community (not self-service redemption yet; the desktop activation entry ships with the first key batch). Expired licenses gracefully fall back to the permanent Free 2-seat tier — your configuration persists.

**System requirements**: Windows 10 / 11 (64-bit) + access to Telegram and your chosen AI providers.

**Assets**
| File | Size | SHA256 |
|---|---|---|
| MyAIGroupChat-Setup-3.0.0.exe | 10,012,875 B | `C5AC0E9E5C4E6412E8A87F90D14DFB90E35B7F84041B896D18F518628577899E` |
| MyAIGroupChat-Portable-3.0.0.zip | 10,540,799 B | `B484670DA13F717EA1514C653B60B8122F099318CEC06E9392945F8C68BC7FC0` |

*Installer = per-user install (no UAC prompt), desktop shortcut optional. **When it finishes, the installer opens the user guide and the bundled `browser-extension/` folder automatically** — install the Web Bridge extension from there (Chrome Web Store or Load unpacked). Portable = unzip and run; keep the folder together.*

---

## [ZH]

### My AI Group Chat 3.0.0 — 让你日常在用的 AI，组成一支自动分工的 AI 军团

把你在用的 ChatGPT、Claude、Gemini、DeepSeek 和本地代码 AI 桥接成一个会议群组。电脑上驻扎你的 AI 军团，手机 Telegram 就是远程指挥台。

**亮点**
- **三步向导**：创建 Telegram 机器人与群组 → 接入你的 AI → 发起会议。
- **永久免费 2 席**——无需插件、无需绑卡、无时间限制。
- **付费档位**（同一安装包，仅限**同时参会的 AI 数量**）：Solo 4 席 $19.99 · Team 6 席 $39.99 · Ultra 12 席 $79.99 —均为**一次性支付 12 个月，不自动续费**。
- **BYOS**：直接复用你浏览器已登录的 AI 会话与本地代码工具——网页版 AI 免 API 密钥，不用重新调教，延续你的使用偏好。
- **AI 调度 AI**：指定主持人 AI 派发任务、发起交叉评审、汇总结果。
- **扩展开源**（Apache-2.0），可完整安全审计。

**隐私通俗版**
- 调度控制流运行于本机回环 `127.0.0.1:18765`，无官方中心服务器。
- 内容会流向你选择的第三方：Telegram 群组与你使用的 AI 服务商。开源扩展会从 Cloudflare Worker 拉取签名定位规则以适配 AI 网站改版（仅常规连接元数据，不含任何会话内容）。
- 早期预览：30 天 Solo 4 席体验码通过私信作者或加入早期社群获取（暂无自助领取入口，桌面激活入口将随首批体验码就位）。到期后自动平滑回落至永久免费 2 席，本地配置完整保留。

**系统要求**：Windows 10 / 11（64 位）＋可访问 Telegram 及你所使用的 AI 服务商的网络环境。

**资产**
| 文件 | 大小 | SHA256 |
|---|---|---|
| MyAIGroupChat-Setup-3.0.0.exe | 10,012,875 B | `C5AC0E9E5C4E6412E8A87F90D14DFB90E35B7F84041B896D18F518628577899E` |
| MyAIGroupChat-Portable-3.0.0.zip | 10,540,799 B | `B484670DA13F717EA1514C653B60B8122F099318CEC06E9392945F8C68BC7FC0` |

*安装版＝免 UAC 用户目录安装，桌面快捷方式可选；**安装结束时自动打开使用说明与随包 `browser-extension/` 目录**，可直接就地安装浏览器扩展（Chrome 商店或「加载已解压的扩展程序」）。便携版＝解压即用，保持文件夹完整。*

---

## 发布检查单（指挥官点 Publish 前过一遍）

- [ ] exe 重构建（含 gloss 皮肤＋21:1x 施工定稿）⇒ 哈希刷新
- [ ] 干净 VM 验收：安装/配对/双 AI 会议/升降级/产物哈希
- [ ] tag：`v3.0.0`（或指挥官定其他号）
- [ ] Release 定性：**pre-release**（早期预览）还是正式版——建议 pre-release，与 README「早期预览」口径一致
- [ ] MANIFEST 随最终构建重生（build.ps1 已自动化）
- [ ] 抖音评论区回链（3 条热评 24h 冷却窗已过）
