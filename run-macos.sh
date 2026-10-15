#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
fail() { echo "Error: $*" >&2; exit 1; }
command -v xcode-select >/dev/null || fail "Install Xcode Command Line Tools: xcode-select --install"
xcode-select -p >/dev/null 2>&1 || fail "Run xcode-select --install first"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major===26&&minor>=9?0:1)' >/dev/null 2>&1
}
if ! node_ok; then
  echo "Keybr requires Node.js 26.9+ (26.x); installing/selecting it..."
  if type nvm >/dev/null 2>&1; then
    nvm install 26
    nvm use 26
  elif command -v brew >/dev/null 2>&1; then
    brew install node@26
    export PATH="$(brew --prefix node@26)/bin:$PATH"
  else
    fail "Install Node.js 26.9+ via nvm or Homebrew, then rerun. On Monterey, use a Node distribution that still supports macOS 12."
  fi
fi
node_ok || fail "Node.js 26.9+ is not runnable on this Mac (found $(node -v 2>/dev/null || echo none)). Monterey may require an alternate supported Node build."
command -v npm >/dev/null || fail "npm is required."
command -v cargo >/dev/null || fail "Install Rust using https://rustup.rs/"
command -v rustc >/dev/null || fail "Rust compiler missing."
echo "Using $(node -v)"
echo "Installing Keybr dependencies (first run may take a while)..."
npm ci --no-audit --no-fund
npm install --prefix desktop --no-audit --no-fund
echo "Starting Keybr Desktop..."
npm --prefix desktop run dev
