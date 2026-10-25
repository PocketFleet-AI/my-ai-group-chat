# Architecture & Data Privacy Disclosure

## 1. System Architecture

**My AI Group Chat** connects browser AI sessions and local IDE/CLI agents into a collaborative workflow powered by the local desktop engine. The desktop app configures connections and seats; the current meeting workflow is conducted in a Telegram group. The diagram below focuses on the browser connection path.

```text
+--------------------------------------------------------------------------+
| Browser Environment (Open Source Extension Bridge)                       |
|                                                                          |
|   [ChatGPT Tab]      [Claude Tab]      [Gemini Tab]      [Qwen Tab]      |
|         ^                  ^                 ^                ^          |
|         |                  |                 |                |          |
|   +------------------------------------------------------------------+   |
|   |                  Chrome Extension (Manifest V3)                  |   |
|   +------------------------------------------------------------------+   |
+-----------------------------------|--------------------------------------+
                                    | HTTP Polling (127.0.0.1:18765 / 18766 / 18767)
                                    v
+--------------------------------------------------------------------------+
| Local Desktop Machine (Proprietary Engine)                               |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |         PocketFleet Desktop Client (Go + Wails Runtime)          |   |
|   |  - Meeting Lifecycle & State Machine                             |   |
|   |  - Multi-Seat Task Dispatcher (PFBus Protocol)                   |   |
|   |  - Local Telemetry & SQLite Meeting Archive                      |   |
|   +------------------------------------------------------------------+   |
+--------------------------------------------------------------------------+
```

---

## 2. Realistic Data Flow & Network Transmissions

In accordance with responsible engineering practices and the Chrome Web Store Developer Program Policies:

### A. Local Loopback Communication (`127.0.0.1`)
- The browser extension and developer tools communicate with the desktop application strictly via local loopback endpoints, divided by architectural responsibility:
  - **Port `18765` (Primary Control Bridge)**: Handles meeting lifecycle, session management, seat scheduling, and `PFBus` letter polling and posting.
  - **Port `18766` (Task Transport Endpoint)**: Dedicated, decoupled transport pipeline used by `background.js` for streaming direct execution tasks without contending with primary control logic.
  - **Port `18767` (Selector Studio Endpoint)**: Local native debugging interface used by `studio_runner.js` for developer-mode DOM locator inspection.
- This extension-to-desktop hop is local. It does not make the full meeting local: content also reaches the selected AI providers and the configured Telegram group.

### B. Direct Web AI Interactions
- The browser extension operates in the context of your existing web AI accounts (e.g., `chatgpt.com`, `claude.ai`, `gemini.google.com`).
- When a task is dispatched to an AI model, your browser sends the prompt directly to that AI provider's official web servers, exactly as if you typed and submitted the message by hand.

### C. Telegram Group Collaboration
- The current meeting workflow requires your configured Telegram bots and group. Meeting announcements, task content, and AI replies are sent to that group via the Telegram Bot API (`api.telegram.org`).
- This traffic is direct between your local machine and Telegram. Telegram is an external service; meeting content is not confined to your device.
- IDE and CLI agents also communicate using their own provider and tool configuration. The browser bridge diagram does not represent those additional connections.

### D. Zero Cloud Relays for Prompts or Chat Data
- We do not run any central backend server that proxies, logs, or stores your prompts, outputs, or session archives.
- Meeting sessions are persisted locally on your machine.

---

## 3. Remote Selector Updates Service

To adapt to frequent DOM changes across major AI web interfaces (e.g. ChatGPT or Claude UI updates) without requiring full extension store republishing, the extension includes a lightweight selector updates mechanism (`selector_updates.js`):

- **Endpoint**: `https://pocketfleet-selectors.hi-yihua.workers.dev/selectors/v1/`
- **Payload**: Pure CSS/XPath element locator mappings (e.g. input textareas, submit buttons).
- **Security & Integrity**:
  - All downloaded selector bundles are cryptographically verified using **Ed25519 digital signatures** before being applied.
  - SHA-256 hash checking and schema constraints prevent malicious tampering.
- **Privacy Scope & Data Disclosures**:
  - The selector update service is read-only and strictly downloads public rule index files (e.g. `latest.json`).
  - **No prompt text, no chat outputs, and no user identifiers** are transmitted in these requests.
  - As with any standard HTTP connection, standard network connection metadata (such as the client IP address and standard User-Agent header) is naturally received by Cloudflare edge servers during the request.
