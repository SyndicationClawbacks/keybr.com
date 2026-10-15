#!/usr/bin/env bash
# Compatible with macOS's Bash 3.2. nvm does not support `set -e`;
# check each required command explicitly instead of silently exiting inside nvm.
if [ "${BASH_SOURCE[0]}" != "$0" ]; then
  printf 'Run this launcher with: bash run-macos.sh\n' >&2
  return 1
fi
set +e
set +u
set -o pipefail

stage="starting the launcher"
printf '\n[Keybr Desktop] Starting macOS launcher...\n'
trap 'status=$?; if [ "$status" -ne 0 ]; then printf "\n[Keybr Desktop] Stopped while %s (exit %s).\nRead the error above; your saved progress has not been cleared.\n" "$stage" "$status" >&2; fi' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

fail() { printf '[Keybr Desktop] ERROR: %s\n' "$*" >&2; exit 1; }
step() { stage="$1"; printf '\n[Keybr Desktop] %s\n' "$stage"; }
run() {
  "$@"
  local status=$?
  if [ "$status" -ne 0 ]; then exit "$status"; fi
}
node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major===26&&minor>=9?0:1)' >/dev/null 2>&1
}

cd -- "$(dirname "${BASH_SOURCE[0]}")" || fail "Cannot open the repository folder."
[ "$(uname -s)" = "Darwin" ] || fail "Use run-macos.sh on macOS; use npm start on Windows or Linux."
[ -f desktop/package.json ] || fail "Desktop source is missing. Switch to the desktop/tauri-offline branch."
printf '[Keybr Desktop] Repository: %s\n' "$PWD"

step "Checking Xcode Command Line Tools"
xcode-select -p >/dev/null 2>&1 || fail "Run xcode-select --install, finish the installation, then run this launcher again."
xcrun --find clang >/dev/null 2>&1 || fail "Xcode's compiler is unavailable. Finish the Command Line Tools installation first."

step "Checking Node.js (26.9+ in the 26.x series)"
# Most importantly, do NOT source nvm when the active Node already works.
# Loading it used to select a broken/old default before any status was printed.
if ! node_ok; then
  if [ -z "${NVM_DIR:-}" ]; then
    NVM_DIR="$HOME/.nvm"
    if [ -n "${XDG_CONFIG_HOME:-}" ]; then NVM_DIR="$XDG_CONFIG_HOME/nvm"; fi
    export NVM_DIR
  fi
  if [ ! -s "$NVM_DIR/nvm.sh" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
  fi
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    step "Loading nvm without switching to its default Node"
    # --no-use avoids nvm's automatic default-version selection.
    # No errexit/nounset here: nvm documents incompatibility with strict shells.
    . "$NVM_DIR/nvm.sh" --no-use
    nvm_status=$?
    if [ "$nvm_status" -ne 0 ]; then
      printf '[Keybr Desktop] nvm initialization returned %s; checking other Node options.\n' "$nvm_status" >&2
    fi
  fi
  if command -v nvm >/dev/null 2>&1; then
    step "Selecting Node 26 with nvm"
    nvm use 26
    if ! node_ok; then
      step "Installing Node 26 with nvm (requires internet access)"
      if nvm install 26; then nvm use 26; fi
    fi
  fi
  if ! node_ok && command -v brew >/dev/null 2>&1; then
    step "Selecting Homebrew Node 26"
    node_prefix="$(brew --prefix node@26 2>/dev/null)"
    if [ -n "$node_prefix" ] && [ -d "$node_prefix/bin" ]; then
      export PATH="$node_prefix/bin:$PATH"
    fi
    if ! node_ok; then
      step "Installing or updating Homebrew Node 26 (requires internet access)"
      if brew list --versions node@26 >/dev/null 2>&1; then
        run brew upgrade node@26
      else
        run brew install node@26
      fi
      node_prefix="$(brew --prefix node@26)" || fail "Cannot find Homebrew Node 26."
      export PATH="$node_prefix/bin:$PATH"
    fi
  fi
fi
node_ok || fail "No runnable Node 26.9+ found. Install a Node 26 build compatible with your macOS version, then rerun."
command -v npm >/dev/null 2>&1 || fail "npm is missing from the selected Node installation."
printf '[Keybr Desktop] Using %s at %s\n' "$(node --version)" "$(command -v node)"
run npm --version

step "Checking Rust"
if [ -d "$HOME/.cargo/bin" ]; then export PATH="$HOME/.cargo/bin:$PATH"; fi
command -v cargo >/dev/null 2>&1 || fail "Install Rust using rustup from https://rustup.rs/, then rerun."
command -v rustc >/dev/null 2>&1 || fail "The Rust compiler is missing; finish the rustup installation."
run cargo --version
run rustc --version

# This launcher never runs tests or changes GitHub workflow settings.
export HUSKY=0
step "Installing repository dependencies"
run npm ci --no-audit --no-fund
step "Installing desktop dependencies"
run npm install --prefix desktop --no-audit --no-fund
step "Building and opening the Tauri app (the first Rust build can take several minutes)"
printf '[Keybr Desktop] Keep this Terminal open. Quit any older Keybr Desktop instance first.\n'
run npm --prefix desktop run dev
printf '\n[Keybr Desktop] Desktop launcher finished.\n'