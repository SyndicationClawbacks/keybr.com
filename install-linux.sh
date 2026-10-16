#!/usr/bin/env bash
set -euo pipefail
[ "$(uname -s)" = Linux ] || { printf 'This script installs the Linux app.\n' >&2; exit 1; }
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_binary="${1:-$script_dir/keybr-desktop}"
if [ ! -f "$source_binary" ] && [ "$#" -eq 0 ]; then
  case "$(uname -m)" in x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) printf 'Unsupported processor.\n' >&2; exit 1 ;; esac
  source_binary="$script_dir/desktop/releases/Keybr-Desktop-Linux-$arch/keybr-desktop"
  if [ ! -f "$source_binary" ]; then bash "$script_dir/build-desktop.sh"; fi
fi
[ -f "$source_binary" ] || { printf 'App not found: %s\n' "$source_binary" >&2; exit 1; }
if pgrep -x keybr-desktop >/dev/null; then printf 'Quit Keybr Desktop before installing or updating.\n' >&2; exit 1; fi
source_dir="$(cd -- "$(dirname -- "$source_binary")" && pwd)"
[ -f "$source_dir/keybr.png" ] || { printf 'Keep keybr.png next to the executable.\n' >&2; exit 1; }
chmod +x "$source_binary"
libraries="$(ldd "$source_binary")" || { printf 'This binary is not compatible with this Linux machine. Build it locally.\n' >&2; exit 1; }
if printf '%s\n' "$libraries" | grep -q 'not found'; then
  printf 'Missing runtime libraries. On Fedora: sudo dnf install webkit2gtk4.1 gtk3 libappindicator-gtk3\n' >&2
  exit 1
fi
data_dir="${XDG_DATA_HOME:-$HOME/.local/share}"
app_dir="$data_dir/keybr-desktop"
mkdir -p "$app_dir" "$data_dir/applications" "$data_dir/icons/hicolor/256x256/apps"
install -m 755 "$source_binary" "$app_dir/keybr-desktop.new"
mv -f "$app_dir/keybr-desktop.new" "$app_dir/keybr-desktop"
install -m 644 "$source_dir/keybr.png" "$data_dir/icons/hicolor/256x256/apps/io.github.syndicationclawbacks.keybr.png"
if [ -f "$source_dir/LICENSE.txt" ]; then install -m 644 "$source_dir/LICENSE.txt" "$app_dir/LICENSE.txt"; fi
# Escape Desktop Entry's quoted Exec argument, including its percent field codes.
exec_path="${app_dir//\\/\\\\}"
exec_path="${exec_path//\"/\\\"}"
exec_path="${exec_path//\$/\\\$}"
exec_path="${exec_path//\`/\\\`}"
exec_path="${exec_path//%/%%}"
cat > "$data_dir/applications/io.github.syndicationclawbacks.keybr.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Keybr Desktop
Comment=Your personal offline typing computer
Exec="$exec_path/keybr-desktop"
Icon=io.github.syndicationclawbacks.keybr
Terminal=false
Categories=Education;
StartupNotify=true
StartupWMClass=keybr-desktop
EOF
if command -v update-desktop-database >/dev/null; then update-desktop-database "$data_dir/applications"; fi
if command -v gtk-update-icon-cache >/dev/null; then gtk-update-icon-cache -f -t "$data_dir/icons/hicolor" >/dev/null 2>&1 || true; fi
printf 'Installed: %s\nOpen Keybr Desktop from GNOME Activities and pin it to the dash.\n' "$app_dir/keybr-desktop"
nohup "$app_dir/keybr-desktop" > "$app_dir/last-launch.log" 2>&1 < /dev/null &
