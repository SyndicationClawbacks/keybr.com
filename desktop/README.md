# Keybr Desktop — offline Tauri edition

Independent desktop adaptation of Keybr. This is **not a wrapper around the live website**: Webpack bundles the lesson engine, practice pages, models, word lists, books, fonts, and imported assets. Tauri embeds those files. No Node server, Docker service, account, or connection to keybr.com is needed for the installed app.

## Intended targets

| Platform | CI output | Notes |
| --- | --- | --- |
| macOS 12 Monterey and newer | Universal `.dmg` | Intel and Apple Silicon; deployment target `12.0`. |
| Fedora GNOME, x86_64 | `.rpm` | Built on Ubuntu 22.04 for an older glibc baseline; requires GTK3 and WebKitGTK 4.1. |
| Windows, x86_64 | NSIS setup `.exe` | Includes the offline WebView2 installer rather than a setup-time download. |

A deployment target is not proof of runtime compatibility. Launch, typing, persistence, audio, fullscreen, and backup dialogs need manual checks on actual Monterey, Fedora GNOME, and Windows installations. The CI WebKit test is not a Monterey VM. Windows ARM and Linux ARM installers are not included in this matrix.

## Downloading installers

Open this fork's **Actions → Desktop builds**, select a successful run, download the `Keybr-Desktop-*` artifact for your OS, and extract the ZIP. Installers exist only after the corresponding job succeeds. Artifacts are retained for 30 days. This workflow does not publish a release or silently update installed applications.

On a new fork, GitHub may require enabling Actions first. Pushing to `master` or `desktop/**` triggers the workflow. Once the workflow is on the default branch, **Run workflow** is also available.

Mac builds are ad-hoc signed, not Developer-ID signed or notarized. Windows builds are not Authenticode signed. Security warnings are expected. Use only the operating system's per-app approval process for a build you trust; do not disable system security globally. No signing credentials are included or requested.

On Fedora, install the downloaded RPM with dependencies through DNF:

```sh
sudo dnf install ./keybr-desktop-*.rpm
```

Substitute the exact downloaded filename if the pattern does not match. The package includes an application-menu entry.

## Building locally

Build prerequisites: Git, **Node 26.9 or newer**, Rust stable (at least 1.90), and the Tauri native prerequisites for the build OS. Node is used only for building; it is not shipped as a sidecar and is not needed by users installing the app. Modern build-tool compatibility with Monterey itself is separate from compatibility of the final Monterey-targeted application; the CI universal build avoids having to build on the old OS.

Clone this fork and check out the implementation branch, then run from the repository root:

```sh
git switch desktop/tauri-offline
npm ci
npm install --prefix desktop
npm --prefix desktop test
npm --prefix desktop run dev
```

`dev` builds assets and opens the embedded application origin. It does not run a permanent localhost server. Re-run after frontend changes; this adapter has no hot-reload server.

For the universal Mac build, install Xcode Command Line Tools and both Rust targets:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm --prefix desktop run build -- --target universal-apple-darwin --bundles dmg
```

On Fedora:

```sh
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel gcc-c++ make rpm-build
npm --prefix desktop run build -- --bundles rpm
```

On Windows, install Microsoft C++ Build Tools with the desktop C++ workload, Windows SDK, Rust MSVC toolchain, and WebView2:

```powershell
npm --prefix desktop run build -- --bundles nsis
```

Installers are under `desktop/src-tauri/target/**/bundle/`. End users do not need Node, Rust, Git, or a compiler.

The root npm lockfile is untouched and installed with `npm ci`. Desktop tooling is a separate npm project. CI uploads the resolved `desktop/package-lock.json` and `desktop/src-tauri/Cargo.lock` in build-manifest artifacts. Commit these resolved lockfiles before treating a build as a reproducible release; version ranges alone do not pin transitive dependencies.

## Included features and storage

This adapter reuses upstream practice (including lesson settings), statistics, typing test, help, keyboard languages, and anonymous-user storage. The desktop interface is English. Accounts, cloud sync, public profiles, multiplayer, high scores, payments, ads, analytics, and update checks are intentionally absent.

History uses Keybr's IndexedDB store. Lesson settings use its local settings storage. Theme/font preferences use localStorage instead of website cookies. The stable app identifier is `io.github.syndicationclawbacks.keybr`. Changing that identifier or the internal origin can separate the app from previously saved data. Website/browser history remains separate and is not automatically migrated. Export a backup before uninstalling, resetting app data, or moving computers.

**Backup & about → Export backup** opens a native Save dialog. Backups are plain JSON with a versioned format. **Import backup** validates records and presents a confirmation. Import merges history in an IndexedDB transaction, skips duplicate records, and never clears existing history. Replacing lesson settings and theme preferences is a separate, initially unchecked option. A failed settings restore after a successful merge can be retried safely because the history merge is idempotent.

This is the adapter's backup format, not a promise of compatibility with every website export. Backups include history, lesson settings, and color/font preferences, but not the custom-theme artwork database. They are not encrypted. Keep backups private when appropriate. There is no automatic cross-device sync.

## Offline and security design

- The separate frontend entry excludes the website shell and online-only pages. A module-graph audit rejects server or third-party integration packages in the desktop build.
- Dynamic lesson assets are included by Webpack and embedded by Tauri. The build checks for bundled phonetic models. Custom binary `.data` and `.stats` assets are explicitly served as `application/octet-stream` by the native window.
- A restrictive Content Security Policy permits local content and Tauri IPC, not external scripts, fonts, images, frames, form submissions, or connections. Browser tests use the same policy.
- The frontend rejects nonlocal fetch/XHR, WebSocket/EventSource, beacons, and popups. Native navigation permits only the application's exact internal origins and denies new windows.
- Native commands provide backup dialogs and fullscreen, not arbitrary filesystem or shell access. File paths come from the user's native picker. Exports use a temporary file and atomic replacement; imports have a 64 MiB read limit.
- The website normally renders the popup/tooltip container on the server. The desktop entry creates it before rendering React so upstream dialogs work without a server.

These are restrictions on this app's code, not a guarantee that the OS or WebView2 will never make its own update or telemetry request. Downloading build dependencies, CI tooling, and operating-system prerequisites requires internet access.

## Validation

```sh
npm --prefix desktop test
npm --prefix desktop run build:web
cd desktop
npx playwright install --with-deps chromium webkit
npm run test:smoke
```

The dependency-free Node tests cover URL allowlists (including opaque-origin attacks), backup format validation, duplicate-safe merging, and production configuration. Playwright loads bundled pages and models, rejects outside requests, checks missing assets and uncaught errors, and verifies theme/font persistence across reloads. After a native build:

```sh
cargo test --manifest-path desktop/src-tauri/Cargo.toml
```

The frontend targets **Safari 15.0**, the WebKit baseline for early Monterey, with Babel, core-js stable polyfills, and Lightning CSS. APIs or dynamic CSS that cannot be transpiled still need real Monterey testing. CI is not a claim of exhaustive coverage of every lesson mode, language, keystroke, audio device, or OS feature.

Manual acceptance on each target OS:

1. Disconnect networking and launch the installed app, not the browser preview.
2. Finish a lesson, change settings, close and reopen. Verify history and preferences survive.
3. Try another keyboard language, typing test, statistics, sound, and fullscreen.
4. Export a backup, import it on another machine, and import it again to verify duplicate suppression.
5. Confirm the app makes no requests to keybr.com, advertising, or analytics services.

## Attribution and license

Prepared against upstream commit `05a37bc5265f65ff538c59c613db29442f345d51`. The original AGPL-3.0 license and notices remain unchanged. An exact copy is embedded as `LICENSE.txt`. This is an independent fork, not an official Keybr desktop release.

- Upstream: https://github.com/aradzie/keybr.com
- Fork: https://github.com/SyndicationClawbacks/keybr.com
- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/reference/webview-versions/
- https://v2.tauri.app/distribute/macos-application-bundle/
- https://v2.tauri.app/distribute/rpm/
- https://v2.tauri.app/distribute/windows-installer/
- https://v2.tauri.app/plugin/dialog/
