#!/bin/bash
set -e

echo "Updating packages..."
pkg update -y && pkg upgrade -y

echo "Installing Node.js (LTS)..."
pkg install nodejs-lts -y

# Detect Android app context for conditional ttyd installation
INSTALL_TTYD=0
if [[ "$ANDROID_APP" == "1" ]]; then
    echo "Android app context detected (ANDROID_APP=1)."
    INSTALL_TTYD=1
elif [[ "$*" == *"--android-app"* ]]; then # Basic flag detection
    echo "Android app flag detected (--android-app)."
    INSTALL_TTYD=1
fi

if [[ "$INSTALL_TTYD" == "1" ]]; then
    echo "Installing ttyd for WebView integration..."
    pkg install ttyd -y
else
    echo "Skipping ttyd installation."
fi

if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm via npm..."
    npm install -g pnpm

    echo "Setting up pnpm..."
    pnpm setup
else
    echo "pnpm is already installed, skipping installation."
fi

# Reload PATH for current session
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

echo "Installing moltbot-termux globally..."
pnpm add -g moltbot-termux

echo "Applying Termux clipboard fix to pnpm store..."

# Find the clipboard package index.js in the pnpm global store.
# This searches for the specific file we need to stub out.
CLIPBOARD_FIX_PATH=$(find "$HOME/.local/share/pnpm/global" -name "index.js" -path "*/@mariozechner/clipboard/*" | head -n 1)

if [ -n "$CLIPBOARD_FIX_PATH" ]; then
    echo "Found clipboard package at: $CLIPBOARD_FIX_PATH"
    cat > "$CLIPBOARD_FIX_PATH" <<EOF
module.exports = {
  availableFormats: () => [],
  getText: () => "",
  setText: () => {},
  hasText: () => false,
  getImageBinary: () => null,
  getImageBase64: () => null,
  setImageBinary: () => {},
  setImageBase64: () => {},
  hasImage: () => false,
  getHtml: () => "",
  setHtml: () => {},
  hasHtml: () => false,
  getRtf: () => "",
  setRtf: () => {},
  hasRtf: () => false,
  clear: () => {},
  watch: () => {},
  callThreadsafeFunction: () => {}
};
EOF
    echo "Clipboard fix applied successfully."
else
    echo "Warning: Could not automatically locate @mariozechner/clipboard in the pnpm store."
    echo "You may need to apply the fix manually if you see native binding errors."
fi

echo ""
echo "Installation complete!"
echo "Please restart your terminal or run: source ~/.bashrc (or your shell config)"
echo "Then run 'moltbot onboard' to get started."