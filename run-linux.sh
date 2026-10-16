#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_dir="${XDG_DATA_HOME:-$HOME/.local/share}/keybr-desktop"
case "${1:-}" in
  --rebuild) bash "$script_dir/build-desktop.sh"; bash "$script_dir/install-linux.sh" ;;
  '')
    if [ -x "$app_dir/keybr-desktop" ]; then
      nohup "$app_dir/keybr-desktop" > "$app_dir/last-launch.log" 2>&1 < /dev/null &
    else bash "$script_dir/install-linux.sh"; fi ;;
  *) printf 'Usage: bash run-linux.sh [--rebuild]\n' >&2; exit 1 ;;
esac
