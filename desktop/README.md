# Keybr Desktop

Independent, offline Tauri adaptation of Keybr. See [the quick start](../DESKTOP-QUICKSTART.md) for installation. The icon is an original striped K and terminal cursor in a warm, vintage monitor frame.

## Application and storage

The app embeds the upstream practice engine, adaptive lessons, keyboard/language settings, custom text, word lists, books, code/numbers lessons, typing tests, statistics, fonts, sounds and help. It does not run a Node server or open the live website. The interface is English. Accounts, public profiles, scoreboards, multiplayer, payments, ads, analytics and update checks are excluded.

History uses Keybr's IndexedDB storage; settings and themes use localStorage. Keep the application identifier `io.github.syndicationclawbacks.keybr` and its embedded origin stable. Installation scripts replace program files only; they never remove WebView data. Closing the app or removing the source checkout does not remove installed progress.

**Backup & about** uses native file dialogs to save or import a versioned JSON file containing history, lesson settings and color/font preferences. Imports validate records and merge history in one IndexedDB transaction, skipping duplicates. Replacing settings is an explicit checkbox. Backups may contain custom practice text and are not encrypted. Custom theme artwork and website account data are not automatically migrated.

Statistics links to these native backups rather than trying to download through a browser. Resetting statistics has an explicit in-app confirmation. A toast host displays upstream save errors.

## Building

Install the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/) and Rust. The root build scripts select/download checksum-verified Node 26.9, install both npm lockfiles with `npm ci`, then build a release app using the committed Cargo lockfile.

- `build-desktop.ps1`: Windows app, double-click installation launcher, and Start-menu installation script. Installation asks for a destination, defaults to the normal per-user app folder, and remembers custom locations through the Start shortcut.
- `build-desktop.sh`: Linux app, icon and GNOME installation script, or a universal macOS `.app` and installation script.
- `build-desktop.sh --native`: build just the current Mac architecture.

Outputs live in `desktop/releases/`. Mac and Linux outputs also have a `.tar.gz` preserving executable permissions. There is no DMG, MSI, NSIS or RPM generation in this path. Mac bundles are ad-hoc signed. Windows binaries are unsigned. Downloaded builds can require the operating system's per-app approval.

For frontend development, install root and desktop dependencies, then `npm --prefix desktop run dev`. This builds local assets and launches Tauri against its embedded origin. `npm --prefix desktop run serve` previews a built frontend on loopback; native dialogs are only available in the app. Root `npm start` opens the permanently installed app, installing it on first use. `npm run start:web` retains the upstream web-server command.

## Compatibility

| Platform     | Build host                                                   | Installed app                                                          |
| ------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Windows      | Windows with MSVC, SDK and Rust                              | Windows 10/11 with WebView2                                            |
| Mac          | macOS 13.5+ with Xcode tools and Rust                        | Target: macOS 12 Monterey+, Intel and Apple Silicon                    |
| Fedora GNOME | Fedora with GTK3/WebKitGTK 4.1 development packages and Rust | Compatible Fedora libraries; build on the target machine when possible |

The universal Mac app embeds both CPU architectures and targets macOS 12.0. Babel/core-js and Lightning CSS target Safari 15.0. Node 26 itself requires [macOS 13.5+](https://github.com/nodejs/node/blob/v26.9.0/BUILDING.md#platform-list), so building and running have different requirements. Actual Mac and Fedora native launch, audio and dialog behavior require those machines; a Windows build cannot establish that compatibility.

## Local validation and GitHub policy

No desktop smoke-test files or GitHub test jobs are created. The existing workflow is manual packaging only (`workflow_dispatch`); pushes and pull requests do not trigger it. It packages ordinary apps and their install scripts, not installers, and never publishes a release automatically.

Local checks include production bundling, offline module/asset audit, TypeScript compilation, script syntax checks and native Windows compilation. Native interactive verification is performed separately from GitHub.

Verified on the Windows workstation: release compilation, per-user install and update, Start shortcut, native launch, practice/settings rendering, native backup export, and theme persistence after replacing the executable and restarting. All 70 upstream packages compile; the eight existing history/settings checks pass. Full lesson completion, backup import, audio, and native Mac/Fedora behavior are still unverified.

## Offline boundaries

The dedicated bundle omits the website shell and integrations. Its build audit rejects server/third-party modules and missing phonetic assets. CSP and runtime guards restrict connections to local assets and Tauri IPC, block online APIs and deny popups/external navigation. Native backup commands accept paths from user-operated dialogs only, enforce a 64 MiB limit, and save through a temporary file followed by replacement.

System WebView update behavior is controlled by the OS. Dependencies are downloaded during a source build; ordinary installed practice does not require internet access.

## License

The original repository license and notices are retained, with an exact copy bundled as `LICENSE.txt`. Upstream base: `05a37bc5265f65ff538c59c613db29442f345d51`. This is an independent fork, not an official Keybr desktop release.
