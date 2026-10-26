# My AI Group Chat (PocketFleet)

**Windows desktop client that runs the AI accounts you already use — ChatGPT, Claude, Gemini, DeepSeek and local code agents — as one coordinated team over Telegram.**

- **Bring your own accounts.** Browser AIs need no API keys and there is no per-token markup.
- **Unlimited saved AI profiles.** Your licence caps how many AIs may attend one meeting at a time — 2, 4, 6 or 12 depending on your tier.
- **Local-first.** Orchestration runs on your own machine over `127.0.0.1`; there is no PocketFleet relay server between your browser and your desktop app.

## Download — 3.0.0

| Asset | File |
|---|---|
| Installer (Windows 64-bit, per-user, no UAC prompt) | `MyAIGroupChat-Setup-3.0.0.exe` |
| Portable (unzip and run, keep the folder together) | `MyAIGroupChat-Portable-3.0.0.zip` |
| Checksums | `SHA256SUMS.txt` |
| Release notes | `RELEASE-NOTES-v3.0.0.md` |

### Verify your download

```bash
# Windows
certutil -hashfile MyAIGroupChat-Portable-3.0.0.zip SHA256
# macOS / Linux
sha256sum MyAIGroupChat-Portable-3.0.0.zip
```

Compare the output with `SHA256SUMS.txt`.

## After you install

1. Open **My AI Group Chat**.
2. Paste the activation key from your order email into the licence panel (top-right seat badge).
3. Activation is a **local offline signature check** — no device binding, no account required.

## What a seat means

One seat = one AI agent that can join a meeting. **Saved AI profiles and configuration entries are never limited** on any edition — the licence only caps how many agents attend at the same time.

| Edition | Concurrent AI seats | Price | Term |
|---|---|---|---|
| Free | 2 | Free | Forever |
| Solo | 4 | $19.99 | 12 months |
| Team | 6 | $39.99 | 12 months |
| Ultra | 12 | $79.99 | 12 months |

Each paid edition is a **single 12-month payment — no auto-renewal**. When a licence expires, the client falls back to the permanent free 2-seat edition and **your configuration is kept intact**.

## Requirements

Windows 10 / 11 (64-bit), plus access to Telegram and to the AI providers you use.

## Notes

- Seats count concurrent agent sessions, **not people**. Seats are issued to the licence holder.
- Message routing runs locally between your browser, your desktop app and the Telegram group you choose.
