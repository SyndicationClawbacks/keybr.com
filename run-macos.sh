#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app="$HOME/Applications/Keybr Desktop.app"
case "${1:-}" in
  --rebuild) bash "$script_dir/build-desktop.sh"; bash "$script_dir/install-macos.sh" ;;
  '') if [ -d "$app" ]; then open "$app"; else bash "$script_dir/install-macos.sh"; fi ;;
  *) printf 'Usage: bash run-macos.sh [--rebuild]\n' >&2; exit 1 ;;
esac
