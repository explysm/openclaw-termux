# 🦞 OpenClaw Termux

<p align="center">
  <img src="assets/openclaw-termux-header.png" alt="OpenClaw Termux Header" width="800">
</p>

<p align="center">
  <a href="https://github.com/explysm/moltbot-termux/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/explysm/moltbot-termux/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/explysm/moltbot-termux/releases"><img src="https://img.shields.io/github/v/release/explysm/moltbot-termux?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
</p>

**OpenClaw Termux** is a specialized distribution of [OpenClaw](https://github.com/openclaw/openclaw), optimized specifically for **Android devices** via Termux. It brings a powerful personal AI assistant directly to your phone, with deep integration for mobile messaging and system tools.

<p align="center">
  <img src="assets/openclaw-termux.png" alt="OpenClaw Termux in action" width="400">
</p>

---

### 📱 Mobile Optimizations
- **Persistence**: Integrated `termux-wake-lock` to ensure your assistant stays online even when the screen is off.
- **Efficiency**: Capped Node.js heap to **1GB** and optimized SQLite with **WAL mode** for mobile RAM and storage limits.
- **Native Tools**: Integrated `termux-api` for native Android notifications, toasts, and optional SMS control.
- **Search**: Includes built-in **DuckDuckGo** support for free, API-keyless web searching.
- **Health**: Specialized `moltbot doctor` checks tailored for common Termux environment issues.

---

### 🚀 Getting Started

#### 1. Quick Install
The recommended path for most users:
```bash
curl -s https://explysm.github.io/moltbot-termux/install.sh | sh
```

#### 2. Configuration
Initialize your workspace and link your accounts:
```bash
moltbot onboard
```

#### 3. Start the Gateway
Run the control plane manually (daemon mode is currently disabled on Android):
```bash
moltbot gateway --port 18789 --verbose
```

#### Setting up on a "server phone"?
Go to [explysm/OpenClaw-Termux-Android](https://github.com/explysm/openclaw-termux-android/releases) and download the latest apk for a experimental "Ui Wrapper."

---

### 🕹 Common Commands

| Task | Command |
| :--- | :--- |
| **Send Message** | `moltbot message send --to <number> --message "Hi"` |
| **Direct Turn** | `moltbot agent --message "Build a grocery list" --thinking high` |
| **Health Check** | `moltbot status` or `moltbot health` |
| **Fix Issues** | `moltbot doctor --fix` |
| **Self-Update** | `moltbot update` |

---

### 🛠 Troubleshooting & Fixes

**Manual Clipboard Fix**:
If clipboard support is missing, run this to stub the provider for mobile:
```bash
# Save as fix-clipboard.sh and run
CLIPBOARD_FIX_PATH=$(find "$HOME/.local/share/pnpm/global" -name "index.js" -path "*/@mariozechner/clipboard/*" | head -n 1)
if [ -n "$CLIPBOARD_FIX_PATH" ]; then
    cat > "$CLIPBOARD_FIX_PATH" <<EOF
module.exports = {
  availableFormats: () => [], getText: () => "", setText: () => {}, hasText: () => false,
  getImageBinary: () => null, getImageBase64: () => null, setImageBinary: () => {},
  setImageBase64: () => {}, hasImage: () => false, getHtml: () => "", setHtml: () => {},
  hasHtml: () => false, getRtf: () => "", setRtf: () => {}, hasRtf: () => false,
  clear: () => {}, watch: () => {}, callThreadsafeFunction: () => {}
};
EOF
fi
```

**Gemini CLI NDK Build Fix** (if `gemini-cli` npm install fails):
```bash
mkdir -p ~/.gyp && echo "{ 'variables': { 'android_ndk_path': '' } }" > ~/.gyp/include.gypi
```

---

### 🦞 Links & Support
- **Official Documentation**: [docs.molt.bot](https://docs.molt.bot)
- **Security Guidance**: [gateway/security](https://docs.molt.bot/gateway/security)
- **Upstream Project**: [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- **Community**: [Discord](https://discord.gg/clawd)

*OpenClaw Termux is maintained by the community. Licensed under MIT.*
