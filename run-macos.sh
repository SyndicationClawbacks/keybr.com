#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
fail() { echo "Error: $*" >&2; exit 1; }
command -v xcode-select >/dev/null || fail "Install Xcode Command Line Tools: xcode-select --install"
xcode-select -p >/dev/null 2>&1 || fail "Run xcode-select --install first"
command -v node >/dev/null || fail "Install Node.js 26.9+ (compatible with your macOS version)."
command -v npm >/dev/null || fail "npm is required."
command -v cargo >/dev/null || fail "Install Rust using https://rustup.rs/"
command -v rustc >/dev/null || fail "Rust compiler missing."
node -e 'const v=process.versions.node.split(".").map(Number); if(v[0]<26||(v[0]===26&&v[1]<9)){console.error("Node.js 26.9+ required; found "+process.version);process.exit(1)}' || fail "Upgrade Node.js"
echo "Installing Keybr dependencies (first run may take a while)..."
npm ci --no-audit --no-fund
npm install --prefix desktop --no-audit --no-fund
echo "Starting Keybr Desktop..."
npm --prefix desktop run dev
