# Keybr Desktop

Your personal typing computer. Same Keybr lessons, settings, typing tests and statistics; all content and progress stay on your device. No ads, account, multiplayer or scoreboards.

## Windows

From this checkout, run in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run-windows.ps1
```

On first use it builds and installs the app in `%LOCALAPPDATA%\Programs\Keybr Desktop`, adds **Keybr Desktop** to Start, and opens it. Afterward use Start or pin it to your taskbar. No terminal or development server needs to stay open. The same command opens the installed app immediately on later runs.

A source build needs [Rust (MSVC)](https://rustup.rs/) and [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++** and the Windows SDK. The build script downloads a checksum-verified Node 26.9 runtime into this checkout if needed; it does not replace system Node. Windows also needs [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/), normally already installed on Windows 10/11.

If you already have a built release folder, run its `install-windows.ps1` instead. That requires no compilers or Node.

## Apple Silicon and Intel Macs

On a newer Mac with Xcode Command Line Tools and Rust:

```sh
bash run-macos.sh
```

The first run builds a universal app (Apple Silicon + Intel), installs it in `~/Applications`, and opens it. Keep it in the Dock or open it from Spotlight. Later runs just open the installed app.

**For Monterey:** build on a Mac running macOS 13.5 or newer, then copy `desktop/releases/Keybr-Desktop-macOS-universal.tar.gz` to the Monterey Mac. Extract it and run `bash install-macos.sh` inside the extracted folder. Monterey needs no Node or Rust to install or run the app. This distinction matters: the fork's Node 26 build tools do not support Monterey.

The app targets macOS 12.0. The frontend targets Safari 15 and includes compatibility polyfills. Builds are ad-hoc signed, not notarized; for a downloaded app macOS may require **Open Anyway** in Privacy & Security after an initial launch attempt. Native behavior on your Macs still needs checking.

## Fedora GNOME

Install build prerequisites once:

```sh
sudo dnf install gcc-c++ make pkgconf-pkg-config openssl-devel webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel patchelf libatomic
```

Install Rust from [rustup.rs](https://rustup.rs/), then:

```sh
bash run-linux.sh
```

It builds and installs into `~/.local/share/keybr-desktop` (or `$XDG_DATA_HOME/keybr-desktop`) and adds **Keybr Desktop** to GNOME Activities. Pin it to the dash if you like. Future launches need no compiler, Node or terminal.

For a prebuilt Linux release, extract it and run `bash install-linux.sh`. It needs the same processor architecture and compatible system libraries. On Fedora, runtime packages are `webkit2gtk4.1 gtk3 libappindicator-gtk3`. Linux has not been exercised on a Fedora machine in this workspace.

## Updating and moving between computers

Quit the app first. To rebuild and update from source:

```powershell
.\run-windows.ps1 -Rebuild
```

```sh
bash run-macos.sh --rebuild
# or
bash run-linux.sh --rebuild
```

To update from a built release, rerun that release's installation script. Updates replace the app without clearing its data. Use **Backup & about** to export your history/settings and import them on another computer. Imports merge history without duplicates. Keep backups before uninstalling or resetting app data.

Build-only commands are `powershell -File .\build-desktop.ps1` and `bash build-desktop.sh`. On a Mac, `bash build-desktop.sh --native` builds only that Mac's architecture; install its `.app` by passing the path to `install-macos.sh`.

No GitHub smoke tests or automatic workflows are added. The existing optional **Build desktop apps (manual)** workflow only packages apps and installation scripts when explicitly dispatched.
