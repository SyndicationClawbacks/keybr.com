#!/usr/bin/env bash
# macOS Bash 3.2 and Linux Bash. Build once; installed apps need no toolchain.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
repo="$PWD"
case "$(uname -s)" in
  Darwin)
    platform=darwin
    mac_version="$(sw_vers -productVersion)"
    mac_major="${mac_version%%.*}"
    mac_minor="${mac_version#*.}"; mac_minor="${mac_minor%%.*}"
    if [ "$mac_major" -lt 13 ] || { [ "$mac_major" -eq 13 ] && [ "$mac_minor" -lt 5 ]; }; then
      printf 'Building needs macOS 13.5+ for Node 26. On Monterey, use install-macos.sh with the universal app built on a newer Mac.\n' >&2
      exit 1
    fi
    xcrun --find clang >/dev/null || { printf 'Install Xcode Command Line Tools: xcode-select --install\n' >&2; exit 1; }
    ;;
  Linux) platform=linux ;;
  *) printf 'Use build-desktop.ps1 on Windows.\n' >&2; exit 1 ;;
esac
export PATH="$HOME/.cargo/bin:$PATH"
command -v cargo >/dev/null || { printf 'Install Rust from https://rustup.rs/ and rerun.\n' >&2; exit 1; }
if [ "$platform" = linux ]; then
  pkg-config --exists gtk+-3.0 webkit2gtk-4.1 openssl || {
    printf 'On Ubuntu run: sudo apt update && sudo apt install build-essential curl wget file pkg-config libssl-dev libwebkit2gtk-4.1-dev libgtk-3-dev libxdo-dev libayatana-appindicator3-dev librsvg2-dev patchelf libatomic1\n' >&2
    printf 'On Fedora run: sudo dnf install gcc-c++ make pkgconf-pkg-config openssl-devel webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel patchelf libatomic\n' >&2
    exit 1
  }
fi
if ! command -v node >/dev/null || ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a===26&&b>=9?0:1)' 2>/dev/null; then
  case "$(uname -m)" in arm64|aarch64) arch=arm64 ;; x86_64) arch=x64 ;; *) printf 'Unsupported processor.\n' >&2; exit 1 ;; esac
  name="node-v26.9.0-$platform-$arch"
  tools_dir="$repo/desktop/.tools"
  if [ ! -x "$tools_dir/$name/bin/node" ]; then
    mkdir -p "$tools_dir"
    printf 'Downloading build-only Node 26.9.0...\n'
    curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/v26.9.0/SHASUMS256.txt" -o "$tools_dir/SHASUMS256.txt"
    curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/v26.9.0/$name.tar.gz" -o "$tools_dir/$name.tar.gz"
    expected="$(awk -v name="$name.tar.gz" '$2==name {print $1}' "$tools_dir/SHASUMS256.txt")"
    if [ "$platform" = darwin ]; then actual="$(shasum -a 256 "$tools_dir/$name.tar.gz" | awk '{print $1}')";
    else actual="$(sha256sum "$tools_dir/$name.tar.gz" | awk '{print $1}')"; fi
    [ -n "$expected" ] && [ "$actual" = "$expected" ] || { printf 'Node checksum mismatch.\n' >&2; exit 1; }
    tar -xzf "$tools_dir/$name.tar.gz" -C "$tools_dir"
  fi
  export PATH="$tools_dir/$name/bin:$PATH"
fi
export HUSKY=0
printf 'Building the permanent app. The first build can take several minutes.\n'
npm ci --no-audit --no-fund
npm ci --prefix desktop --no-audit --no-fund
npm --prefix desktop run build:app -- "$@"
