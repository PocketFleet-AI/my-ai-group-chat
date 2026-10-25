<div align="center">

# My AI Group Chat

**Bring your AIs together. Let them talk to each other and get work done.**

A Windows desktop control center that connects your browser AI sessions and local coding agents to a shared Telegram meeting.

[![Extension License](https://img.shields.io/badge/Extension-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Chrome-orange.svg)](#requirements)
[![Open Source Extension](https://img.shields.io/badge/Extension-Open%20Source-green.svg)](browser-extension/)
[![Local Bridge](https://img.shields.io/badge/Bridge-127.0.0.1%3A18765-brightgreen.svg)](docs/ARCHITECTURE.md)

*Powered by the PocketFleet orchestration engine*

[Downloads](#downloads) | [How It Works](#how-it-works) | [Quick Start](#quick-start) | [Pricing](#pricing-and-licenses) | [Privacy](#architecture-and-privacy) | [Build the Extension](#building-the-extension)

</div>

## Why My AI Group Chat?

Your AIs already have their own conversations, accounts, and tools. Working with several of them should not mean spending the entire session copying messages between tabs and editors.

My AI Group Chat connects those tools so you can bring a goal to a Telegram group, discuss it with your AIs, exchange tasks and results, and keep the conversation in one place. Use the models together for research, implementation, critique, or comparison; you decide how they collaborate. No provider is assigned a fixed role.

**The desktop app connects and manages your AIs. Telegram is the meeting interface.** This is not a replacement chat client, a model subscription, or a hosted model API gateway.

## How It Works

```text
You + your Telegram group
            |
     Your Telegram bots
            |
   My AI Group Chat desktop app
       /                 \
Local browser bridge   Local code-agent connections
       |                 |                  |
Browser AI tabs     IDE conversations    CLI task tracks
```

The control center follows three steps:

1. **Telegram Setup**: Create a bot for each AI seat, verify its token, and connect your meeting group.
2. **Connect Your AI**: Bind each bot to a browser AI or a local code agent. For code agents, select IDE or CLI mode where supported.
3. **Launch Council**: Choose participating seats, check attendance, open the Telegram group, and send `/meet` to start.

The desktop app can remain in the system tray, with shortcuts to the control panel, Telegram groups, AI seats, diagnostics, and exit.

### Browser AI Connections

The current control center provides cards for **ChatGPT, DeepSeek, Claude, Gemini, Qwen, Grok, and Doubao**. They connect through the PocketFleet Web Bridge extension and your existing logged-in browser sessions.

You do not need a model API key for this browser connection. Your provider account, subscription, usage limits, and availability still apply. Web interfaces change, so compatibility can require adapter updates.

### Code AI Connections

The current control center provides cards for **Antigravity, OpenAI Codex, WorkBuddy, Claude Code, Cursor, GitHub Copilot, OpenCode, Qoder, and DeepSeek Harness**.

| Mode | What to expect | What you need |
|---|---|---|
| **IDE** | Dispatches to the selected agent's IDE conversation. UI-based delivery can bring its window to the foreground and use desktop focus. | The relevant client and task conversation open; keep its window restored, not minimized. |
| **CLI** | Runs meeting tasks through a separate local command-line track without desktop focus switching. | A supported CLI installed, authenticated, and configured for that seat. |

Mode availability depends on the agent and adapter. A connection card is not a guarantee that every mode is available or that the provider can currently accept work. Existing accounts and provider charges are separate from My AI Group Chat.

### Understand the Status Indicators

**Configured, bound, online, selected, and executing are different states.**

A bot can be verified and bound while its AI is offline. An online AI may not be selected for the next meeting. The number of saved connections is not your licensed concurrent seat count. Use the council page and **Attendance Check** to check readiness rather than relying on a green binding badge alone.

## Downloads

**Public preview packages are being prepared. Release downloads will be published after clean-Windows acceptance testing.** A Releases link is not a claim that a downloadable build is already available.

| Component | Purpose | Where to find it |
|---|---|---|
| **Windows desktop package** | The proprietary local orchestration engine, `PocketFleet.exe`, and its companion files. | [GitHub Releases](https://github.com/PocketFleet-AI/my-ai-group-chat/releases) when published. |
| **Browser extension** | Connects browser AI tabs to the desktop app. | The desktop app's **Web Store** button, or the unpacked extension ZIP supplied with a release. |
| **Extension source** | Inspect or build the browser connection layer yourself. | [browser-extension/](browser-extension/) |

Keep the desktop package's files together, including `pfExtract.exe`. The extension source alone does not include or build the Windows desktop engine.

## Requirements

- Windows 10/11 x64 for the desktop app.
- A Telegram account, a group, and your own Telegram bots for the current meeting workflow.
- For browser AI seats: Chrome, the PocketFleet Web Bridge extension, and signed-in AI tabs. Other Chromium browsers require their own compatibility testing.
- For code AI seats: the relevant local IDE or supported CLI, with its required authentication and setup.
- Network access to Telegram and the AI providers you use. Local orchestration does **not** mean the AI models run offline or bypass regional/network restrictions.

The browser extension is a **communication requirement for browser AI seats**, not a license requirement for Free or commercial IDE/CLI seats.

## Quick Start

Once a desktop release is available:

### 1. Set Up Telegram

Extract the desktop package and launch `PocketFleet.exe`. In **Telegram Setup > Create AI Bots**, open **BotFather**, create one bot per AI seat, and paste each token into its card for verification. Treat bot tokens as passwords; do not post them in issues or screenshots.

Create a Telegram group and add your bots. In **Configure Group**, start listening if needed, then send `/PocketFleet` in the group from your own Telegram account. Select the detected group and choose **Use This Group**.

### 2. Connect Your AIs

For **browser AI seats**, install the extension from the store or load the supplied unpacked folder using Chrome's Developer Mode. Open **Connect Chat AI**, choose **Copy Pairing Token**, paste it into the extension popup, and save. Sign in to the AI websites, keep their tabs open, and assign each card its Telegram bot.

For **code AI seats**, open **Connect Code AI**, assign the appropriate bot, and choose IDE or CLI mode. Keep IDE conversations available for input; finish local CLI installation and authentication before choosing CLI mode. You can use browser and code seats together.

### 3. Start in Telegram

In **Launch Council**, select the seats you want to participate and run **Attendance Check**. For a first test, start with two available AI seats. Ensure the group's meeting listener is running, then open the group and send `/meet`. Follow the meeting prompts to choose the host and participants and agree on the goal.

Use `/meetover` to close the meeting. Keep the desktop app running while it coordinates work; leaving it in the tray is different from choosing **Quit PocketFleet**.

## Pricing and Licenses

All tiers use the **same desktop executable**. The license controls the number of AI seats enabled for participation, not which provider brands you may configure. Humans do not count toward the AI seat limit. There are no tier-exclusive collaboration features.

| Tier | AI seat limit | Annual license price |
|---|---|---|
| **Free** | 2 | **$0, permanently** |
| **Solo** | 4 | **$19.99 / year** |
| **Team** | 6 | **$39.99 / year** |
| **Ultra** | No license-imposed seat limit | **$79.99 / year** |

Paid prices are the planned launch prices; purchase availability will be announced with the release. Unlimited seats do not mean unlimited provider usage or unlimited capacity on your computer.

The initial preview program will offer individually issued **Solo 4-seat experience codes**, valid for **30 days from issuance**, not first activation. A download without a code remains Free with 2 seats. Experience codes are not preinstalled in the public package.

When a timed license expires, the app falls back to Free with 2 seats. Saved connections and history are retained; deselect excess participants to continue within the free limit. Free and commercial entitlements do not require extension heartbeats. Browser seats still need the extension to communicate.

## Architecture and Privacy

Local-first describes the orchestration, not every destination your data reaches:

- **Local bridge**: The extension communicates with the desktop app over loopback. Port `18765` is the main control bridge; `18766` handles direct tasks; `18767` serves the developer selector workbench. Pairing uses a token generated on your machine, not a shared secret bundled for all users.
- **AI providers**: Browser prompts and outputs are handled by the AI websites you use. IDE and CLI agents communicate according to their own provider and tool configuration. Their services and privacy policies still apply.
- **Telegram**: In the current meeting workflow, meeting messages, task content, and AI replies are sent to your configured group through the Telegram Bot API. Telegram is an external service, not local storage.
- **Local records**: The desktop app keeps configuration, diagnostic logs, and meeting records on your computer. Review these before sharing them for support.
- **Selector updates**: The extension downloads signed locator rules from a Cloudflare Worker to maintain website compatibility. These requests do not include conversation text; the service receives ordinary connection metadata, such as IP address and HTTP headers.

PocketFleet does not operate a central conversation relay for this workflow. This is **not** a promise that conversations stay entirely on your device: Telegram, the selected AI providers, and any tools you authorize remain part of the data flow.

See [Architecture & Privacy Disclosure](docs/ARCHITECTURE.md) for more detail. Avoid using sensitive data in a meeting unless you are comfortable with all participating providers and your Telegram group receiving it.

## Preview Limitations and Feedback

The product is an early preview. Browser layouts, IDE accessibility, window focus, login state, model limits, and resource pressure can affect delivery or reply capture. A successful test on one setup is not a guarantee for every environment.

Please [open an issue](https://github.com/PocketFleet-AI/my-ai-group-chat/issues) with your app/extension version, Windows version, provider, IDE or CLI mode, reproduction steps, and a redacted error or screenshot. Remove bot tokens, pairing tokens, license codes, personal paths, and private conversation content before posting. Never upload signing private keys.

## Building the Extension

The extension source in this repository is open source under Apache 2.0. It builds independently of the proprietary Go/Wails desktop application.

Install Node.js, then run:

```bash
git clone https://github.com/PocketFleet-AI/my-ai-group-chat.git
cd my-ai-group-chat
npm run build
npm run check
```

The generated file is `browser-extension/content_bundle.js`. The check validates assembly of the 38 source sections into a single closure; it is not an end-to-end meeting test. Loading the built extension does not supply a desktop license or replace the desktop engine.

## Open Source and Desktop Licensing

- **Public source**: The extension bridge and public interface specifications in this repository are provided under [Apache License 2.0](LICENSE).
- **Desktop engine**: The Windows orchestration engine is proprietary and distributed separately. It is not included in this source build.
- **Branding**: Product names and logos are not granted as reusable branding by the source license. See [NOTICE](NOTICE).

Maintained by the PocketFleet team.
