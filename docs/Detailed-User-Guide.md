# Setup and Advanced Guide

[Product overview](../README.md) | [中文详细配置手册](详细配置手册.md)

This guide covers the current desktop workflow. Public release packages remain subject to clean-Windows acceptance testing. The public extension source alone does not build or replace the desktop engine.

## Requirements

- Windows 10/11 x64 for the desktop app.
- A Telegram account, a group, and your own Telegram bots for the current meeting workflow.
- For browser AI seats: Chrome, the PocketFleet Web Bridge extension, and signed-in AI tabs. Other Chromium browsers require their own compatibility testing.
- For code AI seats: the relevant local IDE or supported CLI, with its required authentication and setup.
- Network access to Telegram and the AI providers you use. Local orchestration does **not** mean the AI models run offline or bypass regional/network restrictions.

The browser extension is a **communication requirement for browser AI seats**, not a license requirement for Free or commercial IDE/CLI seats.

## Install and Connect

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

## Connection Modes and Status

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

### Context and Permissions

A browser or IDE connection works with the context available in its selected conversation. It does not transfer all account history between products or models. CLI meeting tracks are separate from IDE conversations; access to IDE background depends on the adapter and readable history. Do not assume an agent has read or inherited it.

Dispatch does not grant extra filesystem, terminal, or account permissions. Review tool approvals and outputs as you normally would.

### License and Communication Requirements

Free allows 2 participating AI seats; Solo 4; Team 6; Ultra has no license-imposed seat limit. Saved connections are not the concurrent participation count. Humans do not count toward AI seats.

An expired timed license falls back to Free. Keep saved seats and history, then deselect participants above the free limit. Free and commercial entitlements do not require extension heartbeats, but browser AI communication still needs the extension.

Experience codes are valid for 30 days from issuance. The current setup wizard does not expose a visible code-entry control; distribution and import instructions will be announced and verified for the preview release. Do not assume an activation screen already exists, or post codes in public issues. Importing a code does not restart its validity period.

## Downloads

**Public preview packages are being prepared. Release downloads will be published after clean-Windows acceptance testing.** A Releases link is not a claim that a downloadable build is already available.

| Component | Purpose | Where to find it |
|---|---|---|
| **Windows desktop package** | The proprietary local orchestration engine, `PocketFleet.exe`, and its companion files. | [GitHub Releases](https://github.com/PocketFleet-AI/my-ai-group-chat/releases) when published. |
| **Browser extension** | Connects browser AI tabs to the desktop app. | The desktop app's **Web Store** button, or the unpacked extension ZIP supplied with a release. |
| **Extension source** | Inspect or build the browser connection layer yourself. | [browser-extension/](../browser-extension/) |

Keep the desktop package's files together, including `pfExtract.exe`. The extension source alone does not include or build the Windows desktop engine.

## Architecture and Privacy

Local-first describes the orchestration, not every destination your data reaches:

- **Local bridge**: The extension communicates with the desktop app over loopback. Port `18765` is the main control bridge; `18766` handles direct tasks; `18767` serves the developer selector workbench. Pairing uses a token generated on your machine, not a shared secret bundled for all users.
- **AI providers**: Browser prompts and outputs are handled by the AI websites you use. IDE and CLI agents communicate according to their own provider and tool configuration. Their services and privacy policies still apply.
- **Telegram**: In the current meeting workflow, meeting messages, task content, and AI replies are sent to your configured group through the Telegram Bot API. Telegram is an external service, not local storage.
- **Local records**: The desktop app keeps configuration, diagnostic logs, and meeting records on your computer. Review these before sharing them for support.
- **Selector updates**: The extension downloads signed locator rules from a Cloudflare Worker to maintain website compatibility. These requests do not include conversation text; the service receives ordinary connection metadata, such as IP address and HTTP headers.

PocketFleet does not operate a central conversation relay for this workflow. This is **not** a promise that conversations stay entirely on your device: Telegram, the selected AI providers, and any tools you authorize remain part of the data flow.

See [Architecture & Privacy Disclosure](ARCHITECTURE.md) for more detail. Avoid using sensitive data in a meeting unless you are comfortable with all participating providers and your Telegram group receiving it.

## Troubleshooting

| Symptom | Check |
|---|---|
| The extension cannot connect | Keep the desktop app running; save the current pairing token in the extension popup. Do not use another machine's token. |
| A verified bot has an offline AI | Bot verification is not provider readiness. Check login state, the selected conversation, and the council attendance status. |
| IDE delivery cannot find an input | Open the relevant task conversation, restore the window, and keep the editor available. Do not repeatedly resend when submission is uncertain. |
| CLI execution fails | Check that the selected CLI is installed, authenticated, supported, and able to run in its configured workspace. |
| Opening the group does not start a meeting | In the currently documented flow, open the group and send `/meet` yourself. Do not assume a desktop navigation action submitted it. |
| An expired license reports excess seats | Deselect extra participants to stay within Free's 2-seat limit; do not delete saved connections. |
| Phone messages get no response | The Windows PC must be awake and online, the desktop meeting listener active, and the selected AI tools available. The phone does not run the desktop engine. |

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

- **Public source**: The extension bridge and public interface specifications in this repository are provided under [Apache License 2.0](../LICENSE).
- **Desktop engine**: The Windows orchestration engine is proprietary and distributed separately. It is not included in this source build.
- **Branding**: Product names and logos are not granted as reusable branding by the source license. See [NOTICE](../NOTICE).
