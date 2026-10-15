# Keybr Desktop — offline Tauri edition

Independent desktop adaptation of the Keybr source in this repository. This is **not a wrapper around the live website**: Webpack bundles the lesson engine, pages, phonetic models, word lists, books, fonts, and other imported assets. Tauri embeds that output in the application. No Node server, Docker service, account, or internet connection is needed to practice after installation.

## Intended targets

| Platform | CI output | Notes |
| --- | --- | --- |
| macOS 12 Monterey and newer | Universal `.dmg` | Intel and Apple Silicon; deployment target `12.0`. |
| Fedora GNOME, x86_64 | `.rpm` | Built on Ubuntu 22.04 to avoid an unnecessarily new glibc baseline; requires GTK3 and WebKitGTK 4.1. |
| Windows, x86_64 | NSIS setup `.exe` | Includes the offline WebView2 installer instead of requiring a download during setup. |

A deployment target and browser transpilation do **not** prove compatibility with every OS release. Actual launch, typing, persistence, sound, fullscreen, and backup dialogs need a manual check on Monterey and on each target desktop. The CI WebKit test is not a Monterey VM. Windows ARM and Linux ARM installers are not part of this matrix.

## Getting installers

Open this fork's **Actions → Desktop builds**, select a successful run, then download the `Keybr-Desktop-*` artifact for your OS and extract the ZIP. Artifacts are produced only after the corresponding build succeeds; adding the workflow does not itself create installers. They are retained for 30 days. The workflow intentionally does not publish a release or silently update installed apps.

GitHub may disable Actions on a new fork. Enable workflows in its Actions tab first. A subsequent push to `master` or a `desktop/**` branch triggers this workflow. If the implementation is awaiting merge, merging it after enabling Actions also triggers a build. Once the workflow is on the default branch, **Run workflow** is another option.

### Signing

Mac builds are ad-hoc signed, not Developer-ID signed or notarized. Windows builds are not Authenticode signed. OS security warnings are therefore expected for downloaded builds. Use the operating system's per-app approval procedure only for a build you trust; do not disable Gatekeeper or other security features globally. No signing credentials are requested or stored by this project.

### Installing on Fedora

From the directory containing the extracted installer:

```sh
sudo dnf install ./keybr-desktop-*.rpm
```

The package installs an application-menu entry. The exact RPM filename includes the version and architecture; substitute the downloaded filename if the shell pattern does not match.

## Local development

Clone this fork and check out the branch containing this directory. Install Git, a recent Node 22 release, Rust stable (at least 1.90), and the Tauri system prerequisites for your build machine.

From the repository root:

```sh
npm ci
npm install --prefix desktop
npm --prefix desktop test
npm --prefix desktop run dev
```

`dev` builds the local assets before opening the native app. It deliberately uses the embedded-asset origin, not a website or a permanent localhost server. Re-run after frontend edits; there is no hot-reload server in this initial adapter.

On macOS, Xcode Command Line Tools are sufficient for desktop development. Building a universal installer additionally requires both Rust targets:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm --prefix desktop run build -- --target universal-apple-darwin --bundles dmg
```

On Fedora, install the native prerequisites, then build the RPM:

```sh
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel gcc-c++ make rpm-build
npm --prefix desktop run build -- --bundles rpm
```

On Windows, install the Microsoft C++ Build Tools with the desktop C++ workload, Windows SDK, Rust MSVC toolchain, and WebView2, then run:

```powershell
npm --prefix desktop run build -- --bundles nsis
```

Installers are under `desktop/src-tauri/target/**/bundle/`. End users installing a built app do not need Node, Rust, Git, or a compiler. Modern build-tool support for Monterey itself is separate from running a Monterey-targeted installer; use the CI-produced universal app when building on the old OS is inconvenient.

The upstream npm lockfile is left untouched and installed with `npm ci`. Desktop tooling lives in a separate npm project, so it does not change the website's dependency graph. The first successful native build produces `desktop/package-lock.json` and `desktop/src-tauri/Cargo.lock`; the workflow uploads those in its build-manifest artifacts. Commit the resolved lockfiles before treating a build as a reproducible release. Top-level desktop ranges alone do not fully pin transitive dependencies.

## What is included

The upstream practice screen (including its lesson settings), profile/statistics, typing test, help, keyboard languages, and local anonymous-user storage are reused. The navigation shell is desktop-specific and the UI locale is English. There is no account login, public profile, cloud sync, multiplayer, high-score service, payment integration, advertisement integration, analytics integration, or automatic updater.

Progress uses Keybr's IndexedDB history store. Lesson settings use its existing local settings storage. Theme preferences use a dedicated localStorage key instead of website cookies. The application identifier is stable: `io.github.syndicationclawbacks.keybr`. Do not change it casually; WebView storage can depend on app identity and origin. Website/browser history is separate and is not migrated automatically. Export a backup before uninstalling, resetting app data, or moving computers.

**Backup & about → Export backup** opens a native Save dialog. Backups are plain JSON with a versioned format. **Import backup** validates the data and presents a confirmation; import merges history in one IndexedDB transaction and skips duplicate records. Existing history is never cleared. Replacing lesson settings and theme preferences is a separate, unchecked option. Invalid records are rejected before the merge. A failed settings restore after a successful merge can be retried safely because merging is idempotent.

The format is this adapter's format, not a claim of compatibility with every website export. Backups include history, lesson settings, and color/font preferences, not the custom-theme artwork database. Keep backups private if they contain sensitive custom practice text. There is no encryption or background cross-device sync.

## Offline/security design

- A dedicated frontend entry excludes the website shell, server entry points, and online-only pages. The build audit fails if server or third-party integration packages enter the desktop module graph.
- All dynamically imported lesson content is included by Webpack and embedded via Tauri's relative `frontendDist`. Phonetic models are required by the build audit.
- A restrictive Content Security Policy allows local assets and Tauri IPC, not external scripts, images, fonts, frames, forms, or connections. The same policy is applied in browser smoke tests.
- The frontend blocks nonlocal fetch/XHR, all WebSocket/EventSource connections, beacons, and popup windows. Native navigation is restricted to the app's exact internal origins; native popup requests are denied.
- Native commands expose only backup dialogs and fullscreen. File paths are selected by the user in a native dialog, never supplied by arbitrary frontend text. Exports use a temporary file and atomic replacement; imports have a 64 MiB read limit.
- There are no shell, opener, HTTP, or general filesystem plugins exposed to the frontend. Tauri's default local core capability is the only granted capability.

This is a policy for **this application's code**, not a promise that Windows, WebView2, or another OS component will never perform its own system update or telemetry request. Downloading dependencies, running CI, and installing OS prerequisites also require internet access.

## Tests and validation

```sh
npm --prefix desktop test
npm --prefix desktop run build:web
cd desktop
npx playwright install --with-deps chromium webkit
npm run test:smoke
```

The dependency-free Node tests check URL allowlists (including opaque-origin attacks), backup validation, duplicate-safe merges, and production configuration. The Playwright tests load the real bundled pages and models, reject outside requests, fail on missing assets or uncaught JavaScript exceptions, and check local preferences across reloads. After a native build, `cargo test --manifest-path desktop/src-tauri/Cargo.toml` tests native navigation and backup validation.

The frontend is transpiled toward Safari 15.6 and includes core-js stable polyfills. Lightning CSS targets Safari 15.6 as well. APIs or dynamic CSS features that cannot be transpiled still require real Monterey testing. Smoke tests are not a claim that every lesson mode, language, keystroke, audio device, or OS feature has been exhaustively tested.

Manual acceptance on each requested OS:

1. Disconnect network access and launch the installed app, not the browser preview.
2. Finish a practice lesson, change lesson settings, close the app, and reopen. Verify the result and preferences survive.
3. Try another keyboard language, typing test, statistics, sound, and fullscreen.
4. Export a backup, import it on another machine, verify history, and import it again to check that history is not duplicated.
5. Confirm the app makes no requests to keybr.com, ad networks, or analytics providers.

## Upstream and license

This adapter was prepared against upstream commit `05a37bc5265f65ff538c59c613db29442f345d51`. The original `LICENSE` and copyright notices remain unchanged. The build embeds an exact copy of that license as `LICENSE.txt`; the desktop adaptation is provided under the repository's existing license. This is an independent fork, not an official Keybr product.

References:

- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/reference/webview-versions/
- https://v2.tauri.app/distribute/macos-application-bundle/
- https://v2.tauri.app/distribute/rpm/
- https://v2.tauri.app/distribute/windows-installer/
- https://v2.tauri.app/plugin/dialog/
