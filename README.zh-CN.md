# My AI Group Chat

[English](README.md) | **简体中文** | [加入内测交流群](#加入内测交流群)

![连接你日常在用的 AI，组成协作团队](docs/images/product/01_your_existing_ais.png)

底层引擎：PocketFleet。浏览器扩展采用 Apache-2.0 开源，Windows 桌面编排引擎闭源。

---
## My AI Group Chat
### 复用你已订阅的 AI 服务，放大已有工具价值，无需额外 Token 开销
> *专为独立开发者与极客打造：多模型代码交叉评审、架构推演与异步重构。*

你已经每月付费订阅 ChatGPT Plus、Claude Pro 等 AI 服务，并在浏览器会话中沉淀了大量工作习惯与上下文。但想要多个 AI 互相协作，你只能在标签页之间手动复制粘贴，充当人工传声筒。

**My AI Group Chat**（由 PocketFleet 驱动）把你现有的浏览器 AI 与本地代码助手，组建为一套高效协同的本地军团。

* **✅ BYOS 自带订阅模式**：直接复用浏览器内已登录的 AI 订阅会话，不产生额外 API 账单。不凭空新建空白 API 实例，直接调用你熟悉并信任的模型。*(注：不承诺跨独立会话完整继承历史记忆)*。
* **✅ AI 调度 AI**：指定一个 AI 担任会议主持人，向其他节点派发任务、发起交叉评审并汇总结果。主持人 AI 可辅助拆解任务，效果取决于模型自身能力与提示词设计。复杂任务拆解仅提供辅助能力，不保证任意复杂需求都能自动拆解成功。
* ✅ **Telegram 异步远程任务面板**：在电脑端发起耗时的高强度重构或交叉评审任务后，即可离开工位。Windows 主机与 AI 网页标签页保持运行。Telegram 是你的异步指挥台与任务传呼机：实时汇总 Agent 里程碑、提示人工介入审批、交付成果直达手机。下班路上也能随时掌握多 AI 并发进度。*(Telegram 仅作为远程通知与指令入口，本项目与 Telegram 无官方隶属关系)*。

> **典型工作流示例**：一个Agent负责架构设计，另一个编写前端UI，第三个审计边界风险，三者在本地 Windows 上并发推进，手机收到提醒后再介入决策。

![电脑保持运行，通过手机 Telegram 下达任务、接收回复](docs/images/product/02_remote_via_telegram.png)

<details>
<summary>展开查看：让你的 AI 交叉评审</summary>

![让多个 AI 比较视角、发现风险、完善结果](docs/images/product/04_ai_cross_review.png)

</details>

*不再手动在各个 AI 窗口来回复制粘贴，交给你的 AI 军团完成消息交接。*

---
## 🚀 三步上手
1. **准备 Telegram 机器人与私有协作群组**
   * 创建专用 Bot 与群组，完整指引见 [详细配置手册](docs/详细配置手册.md)。
2. **接入你日常在用的 AI**
   * **网页 AI**：无需额外 API Key，通过开源伴生插件直接复用浏览器已登录会话；
   * **CLI 代码工具**：使用工具自身的本地凭据或 API 密钥。
3. **启动 AI 军团协作**
   * 桌面端勾选参会席位，在 Telegram 群组发送 `/meet` 开启协同。离开工位，主机持续工作，手机接收状态汇报。

<details>
<summary>展开查看：三步完成协作配置</summary>

![三步开始：准备 Telegram、连接已有 AI、发起协作](docs/images/product/05_setup_three_steps.png)

</details>

---
## 💰 授权与定价
全部档位共用**同一套程序二进制**，仅限制会议内同时参会的 AI 席位数量；人类不计入席位。

*同类多 Agent 工具普遍每月收费 $15–$30，我们 Solo 档位仅需 $19.99/年。*
✅ **免费版具备实际生产力**：开箱即支持双 AI 完整代码评审流。

| 版本 | 同时参会 AI 席位 | 价格 | 说明 |
| :--- | :---: | :---: | :--- |
| **Free 免费版** | **2 席** | **$0 / 永久免费** | 完整双 AI 对话审查 |
| **Solo 标准版** | **4 席** | **$19.99 / 年** | 全栈开发与并行任务拆解 |
| **Team 团队版** | **6 席** | **$39.99 / 年** | 复杂多智能体协作管线 |
| **Ultra 旗舰版** | **无限制** | **$79.99 / 年** | 高密度多模型矩阵协同 |

*购买通道：Lemon Squeezy 入口将在正式发版时激活。*

首批预览用户可通过私信作者或加入早期内测社群领取 **30 天 Solo 4 席体验码**。直接在桌面控制中心激活，无需绑定信用卡。到期后所有本地配置与记录完整保留，自动平滑回落至永久免费 2 席。*(体验码不预置在安装包内)*。

## 加入内测交流群

扫描下方微信二维码，加入 **My AI Group Chat** 交流群，交流使用心得、反馈问题，并咨询首批体验码。

<a href="docs/images/wechat-preview-group-20261101.jpg"><img src="docs/images/wechat-preview-group-20261101.jpg" alt="My AI Group Chat 微信内测交流群二维码" width="320" /></a>

点击图片可查看原图。二维码图示有效期为 **2026 年 11 月 1 日前**；若已失效，请[通过 GitHub Issues 提醒更新](https://github.com/PocketFleet-AI/my-ai-group-chat/issues)。

---
## 💻 系统要求与发布状态
* **系统**：Windows 10 / 11 64位（任务执行期间电脑需保持开机且 AI 标签页可用）。
* **网络**：需具备直连 Telegram 及所选 AI 服务商的网络环境。
* **安装包状态**：纯净 VM 验收中，尚未公开发布，正式构建将上传至 [GitHub Releases](https://github.com/PocketFleet-AI/my-ai-group-chat/releases)。

---
## 🔒 本地优先与隐私说明
1. **零自建中转服务器**：调度控制流严格运行于本机回环 `127.0.0.1:18765`，官方无中心服务器截留提示词。
2. **扩展代码开源审计**：浏览器桥接插件采用 **Apache-2.0** 协议开源，零内置广告追踪，无业务统计遥测。为无缝适应各大 AI 官网的前端改版、避免工作流中断，扩展会自动从 Cloudflare Worker 拉取经过签名的 DOM 定位规则库（仅产生常规连接元数据，绝对不包含任何会话内容）。
3. **无厂商锁定**：自由混合搭配网页 AI 与本地代码 Agent。
4. **事实边界提醒**：“本地优先调度”不等于数据永不离机。Prompt 与代码必然经由所选 AI 官网接口和 Telegram Bot API 传输，受对应平台政策约束，请勿投喂高度涉密资产。

---
## 📚 更多深度资料
* 完整安装、BotFather 配置、IDE/CLI 模式说明 → [详细配置手册](docs/详细配置手册.md)
* 架构与深度隐私文档 → [技术架构与隐私说明](docs/ARCHITECTURE.md)
* 浏览器扩展开源源码 → [browser-extension/](browser-extension/)
* 反馈与 Issue → [GitHub Issues](https://github.com/PocketFleet-AI/my-ai-group-chat/issues)

*(Windows 编排引擎为商业闭源，仅靠扩展源码无法运行完整产品。)*
