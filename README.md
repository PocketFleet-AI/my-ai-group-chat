<div align="center">

# 💬 My AI Group Chat

**Bring your AIs together. Let them talk to each other and get work done.**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Chrome-orange.svg)](#downloads)
[![Open Source Extension](https://img.shields.io/badge/Extension-Open%20Source-green.svg)](browser-extension/)
[![Localhost](https://img.shields.io/badge/Bridge-127.0.0.1%3A18765-brightgreen.svg)](docs/ARCHITECTURE.md)

*Powered by PocketFleet Orchestration Engine*

[Downloads](#-downloads) • [Features](#-features) • [Quick Start](#-quick-start) • [Pricing](#-pricing) • [Architecture & Privacy](#-architecture--privacy) • [Building](#-building-the-extension)

---

</div>

## 🌟 Why My AI Group Chat?

You already subscribe to web AI services like **ChatGPT Plus**, **Claude Pro**, or **Gemini Advanced**.  
Why should you manually copy-paste prompts and replies between browser tabs like a human relay? And why incur expensive per-token API bills when you can orchestrate your existing browser sessions directly?

**My AI Group Chat** connects your active browser sessions into a private, multi-agent collaborative workspace on your local machine:

1. **No API Keys Required**: Seamlessly coordinates your existing web AI tabs (ChatGPT, Claude, Gemini, Qwen, DeepSeek, Grok).
2. **True Collaborative Consensus**: A host AI breaks down complex goals, assigns research to Claude, coding to ChatGPT, auditing to Qwen, and synthesizes final deliverables.
3. **Local Loopback Dispatch**: The browser bridge communicates strictly with your local machine (`127.0.0.1:18765`). Your prompts and deliverables never pass through any third-party relay servers.

---

## ⚡ Features

- **Multi-Brand Orchestration**: Assemble heterogeneous models into one productive meeting.
- **Protocol Envelopes (`PFBus`)**: Structured, line-delimited message protocol ensuring clean task isolation and delivery order.
- **Fail-Safe Degradation**: If an AI node outputs conversational banter without strict envelope formatting, content is automatically preserved and displayed rather than silently dropped.
- **Telegram & IDE Connectivity**: Monitor collaborative discussions from Telegram or bridge code deliverables to local development editors.
- **Open-Source Extension Bridge**: Inspect, verify, and build the Manifest V3 browser extension independently.

---

## 🚀 Downloads

| Asset | Description | Link |
|---|---|---|
| **Windows Desktop Engine** | Standalone Wails/Go Orchestrator (Windows 10/11 x64) | [Download Latest Release](https://github.com/PocketFleet-AI/my-ai-group-chat/releases) |
| **Chrome Extension (Store)** | Official Chrome Web Store Extension | *Coming Soon (In Review)* |
| **Chrome Extension (Zip)** | Unpacked Extension for Developer Mode | [Download Extension Zip](https://github.com/PocketFleet-AI/my-ai-group-chat/releases) |

---

## 📖 Quick Start

1. **Run Desktop App**: Download and launch `PocketFleet.exe` (portable executable, no installation needed).
2. **Load Extension**: Load the browser extension into Chrome or Edge (`chrome://extensions` -> Enable Developer Mode -> Load unpacked).
3. **Open AI Web Tabs**: Log into your preferred AI web accounts ([ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), [Gemini](https://gemini.google.com), etc.).
4. **Start Collaboration**: Open the desktop app, select your participating AI seats, enter your project topic, and click **Start Meeting**. Watch your AIs introduce themselves, coordinate tasks, and deliver comprehensive results!

---

## 💎 Pricing & Commercial Licenses

My AI Group Chat provides a **fully-functional permanent free tier** for individual creators, alongside transparent annual commercial licenses based purely on the number of concurrent AI seats:

| Tier | AI Seats | Price | Description |
|---|---|---|---|
| **Free** | **2 Seats** | **$0 / Forever** | Permanent dual-AI collaboration. Fully functional, no ads, no API keys required. |
| **Solo** | **4 Seats** | **$19.99 / Year** | 4 concurrent AI seats for multi-model research, debate, and synthesis teams. |
| **Team** | **6 Seats** | **$39.99 / Year** | 6 concurrent AI seats for comprehensive cross-disciplinary workflows. |
| **Ultra** | **Unlimited** | **$79.99 / Year** | Unlimited concurrent AI seats across all supported browser sessions and agents. |

*Note: Commercial licenses are billed annually (1-year license). The Free tier can be used indefinitely.*

---

## 🔒 Architecture & Privacy

We adhere to clear engineering and privacy disclosures:
- **Local Loopback Communication**: The browser extension communicates strictly with the local desktop application via local loopback endpoints (`127.0.0.1:18765` for main control and meeting orchestration, `18766` for direct task transport).
- **Direct Web AI Requests**: Transmissions to AI services are made directly from your browser to the official provider endpoints (OpenAI, Anthropic, Google, etc.). No conversation text or user prompts are ever routed to PocketFleet servers.
- **Optional Telegram Forwarding**: Users may optionally connect their own Telegram bot to mirror session announcements and AI debate letters to their private Telegram group.
- **Signed Selector Updates**: A read-only Cloudflare Worker endpoint provides cryptographic Ed25519-signed DOM locator updates (`selector_updates.js`) to adapt to frontend UI updates on supported AI websites. Only public rule files are downloaded; no personal data or conversation content is transmitted.
- See our detailed [Architecture & Privacy Disclosure](docs/ARCHITECTURE.md) for complete technical specifications.

---

## 🛠️ Building the Extension

The browser extension source is open-source under the **Apache 2.0 License**. You can inspect and build it yourself in seconds:

```bash
# Clone the repository
git clone https://github.com/PocketFleet-AI/my-ai-group-chat.git
cd my-ai-group-chat

# Build the content bundle
npm run build

# Verify build integrity (38 sections, single closure)
npm run check
```

The compiled bundle will be located at `browser-extension/content_bundle.js`.

---

## ⚖️ Open Source & Trademarks

- **Extension Source Code**: Licensed under the [Apache License, Version 2.0](LICENSE).
- **Trademarks & Desktop Engine**: "PocketFleet", "My AI Group Chat", product logos, and the standalone Windows desktop engine (`PocketFleet.exe`) are proprietary commercial assets. See [NOTICE](NOTICE) for details.

---

<div align="center">
Made with 🌈 by the PocketFleet Team
</div>
