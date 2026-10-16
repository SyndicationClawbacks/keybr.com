#!/usr/bin/env bash
set -euo pipefail
[ "$(uname -s)" = Darwin ] || { printf 'This script installs the Mac app.\n' >&2; exit 1; }
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_app="${1:-$script_dir/Keybr Desktop.app}"
if [ ! -d "$source_app" ] && [ "$#" -eq 0 ]; then
  source_app="$script_dir/desktop/releases/Keybr-Desktop-macOS-universal/Keybr Desktop.app"
  if [ ! -d "$source_app" ]; then bash "$script_dir/build-desktop.sh"; fi
fi
[ -d "$source_app" ] || { printf 'App not found: %s\n' "$source_app" >&2; exit 1; }
identity="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$source_app/Contents/Info.plist")"
[ "$identity" = io.github.syndicationclawbacks.keybr ] || { printf 'This is not a Keybr Desktop app bundle.\n' >&2; exit 1; }
if pgrep -x keybr-desktop >/dev/null; then printf 'Quit Keybr Desktop before installing or updating.\n' >&2; exit 1; fi
applications="$HOME/Applications"
destination="$applications/Keybr Desktop.app"
mkdir -p "$applications"
if [ -e "$destination" ]; then
  installed_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$destination/Contents/Info.plist")"
  [ "$installed_id" = "$identity" ] || { printf 'Another app occupies %s; move it first.\n' "$destination" >&2; exit 1; }
fi
stage="$(mktemp -d "$applications/.keybr-install.XXXXXX")"
cleanup() {
  if [ -d "$stage/previous.app" ] && [ ! -e "$destination" ]; then
    mv "$stage/previous.app" "$destination" || { printf 'Previous app preserved in %s\n' "$stage" >&2; return; }
  fi
  # Only remove our verified staging directory; never touch application data.
  case "$stage" in "$applications"/.keybr-install.*) rm -rf -- "$stage" ;; esac
}
trap cleanup EXIT
ditto "$source_app" "$stage/Keybr Desktop.app"
codesign --verify --deep --strict "$stage/Keybr Desktop.app"
if [ -e "$destination" ]; then mv "$destination" "$stage/previous.app"; fi
if ! mv "$stage/Keybr Desktop.app" "$destination"; then
  if [ -d "$stage/previous.app" ]; then mv "$stage/previous.app" "$destination"; fi
  exit 1
fi
printf 'Installed: %s\nOpen it from Applications or Spotlight; keep it in the Dock if you like.\n' "$destination"
open "$destination"
