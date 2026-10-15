# Keybr Desktop — offline Tauri edition

Independent desktop adaptation of the Keybr source in this repository, not a wrapper around the live website. Webpack bundles the lesson engine, pages, phonetic models, word lists, books, fonts, and other imported assets. Tauri embeds that output in the app rather than running a Node server or Docker service.

## Build automation

**Automatic CI and desktop smoke tests have been removed at the repository owner's request.** There are no push, pull-request, or scheduled workflow triggers on this branch. Playwright, its configuration, the desktop JavaScript test files, browser installation steps, and test-report uploads are removed. The inherited `.github/workflows/ci.yml` is removed as well. Upstream test source files elsewhere in the repository are unchanged.

The sole remaining workflow is **Build desktop installers (manual)**. It contains packaging jobs only and runs solely through `workflow_dispatch`; adding or merging it does not start a build. It does not execute JavaScript or Rust test suites. Once this workflow exists on the default branch, use **Actions → Build desktop installers (manual) → Run workflow** to request installers. A new fork may first require enabling Actions. Successful builds upload `Keybr-Desktop-*` artifacts retained for 30 days. No release is automatically published and the app has no automatic updater.

Previously started runs are not retroactively cancelled by a source change. Historical run records and already delivered notifications are separate from workflow source files.

## Intended platforms and current status

| Platform | Configured installer | Target |
| --- | --- | --- |
| macOS 12 Monterey and newer | Universal `.dmg` | Intel and Apple Silicon; deployment target `12.0`. |
| Fedora GNOME | `.rpm` | x86_64; GTK3 and WebKitGTK 4.1. |
| Windows | NSIS `.exe` | x86_64; configured with offline WebView2 installer. |

These are configured targets, not verified working installers. Native launch, typing, persistence, audio, fullscreen, and dialogs on the requested operating systems remain unverified. Removing tests does not establish that the app is working. The frontend targets Safari 15.0 with Babel, core-js stable polyfills, and Lightning CSS, but a deployment target and transpilation do not prove Monterey compatibility. Windows ARM and Linux ARM packages are not configured.

## Local builds

Install Git, Node compatible with the current upstream dependencies, Rust stable, and the Tauri prerequisites for the build machine. The optional packaging workflow uses Node 26. From the repository root:

```sh
npm ci
npm install --prefix desktop
npm --prefix desktop run dev
```

`dev` builds local assets and opens the native app using its embedded-asset origin. Re-run after frontend edits; this adapter does not use a hot-reload server.

On macOS, install Xcode Command Line Tools, then build a universal installer:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm --prefix desktop run build -- --target universal-apple-darwin --bundles dmg
```

On Fedora:

```sh
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel gcc-c++ make rpm-build
npm --prefix desktop run build -- --bundles rpm
```

On Windows, install the Microsoft C++ Build Tools with the desktop C++ workload, Windows SDK, Rust MSVC toolchain, and WebView2, then run:

```powershell
npm --prefix desktop run build -- --bundles nsis
```

Installers are written under `desktop/src-tauri/target/**/bundle/`. End users do not need Node, Rust, Git, or a compiler to install a built app. Building on Monterey itself is separate from running a Monterey-targeted binary; a universal package can be built on a newer Mac.

The upstream npm lockfile is unchanged. Desktop tooling is a separate npm project; retain and commit its generated `desktop/package-lock.json` and `desktop/src-tauri/Cargo.lock` before treating builds as reproducible. Dependency ranges alone do not pin all transitive versions.

## Installation and signing

Mac builds are ad-hoc signed, not Developer-ID signed or notarized. Windows builds are not Authenticode signed. Downloaded builds may show OS security warnings. Use per-app approval only for a build you trust; do not disable OS security globally. No signing credentials are requested or stored.

On Fedora, install a downloaded RPM with `sudo dnf install ./<downloaded-file>.rpm`. The package includes an application-menu entry.

## Features and local data

The adapter reuses practice and lesson settings, profile/statistics, typing test, help, keyboard languages, and anonymous-user storage. Navigation is desktop-specific and the UI locale is English. It excludes account login, public profiles, cloud sync, multiplayer, high scores, payments, advertising, and analytics.

History uses Keybr's IndexedDB store; lesson settings use its existing local storage. Theme preferences use a dedicated localStorage key rather than website cookies. Keep the application identifier `io.github.syndicationclawbacks.keybr` stable because storage can depend on app identity and origin. Website history is separate and is not migrated automatically. Export a backup before uninstalling, resetting app data, or changing computers.

**Backup & about → Export backup** opens a native Save dialog. **Import backup** validates a versioned JSON backup and asks for confirmation. History is merged in one IndexedDB transaction with duplicate records skipped, without clearing existing history. Replacing lesson settings and theme preferences is a separate unchecked option. A failed settings restore after a successful history merge can be retried without duplicating history.

This is the adapter's backup format, not a claim of compatibility with every website export. Backups include history, lesson settings, and color/font preferences, but not custom-theme artwork. They are not encrypted and may contain custom practice text.

## Offline protections

The dedicated frontend excludes the website shell, server, and third-party integrations. The build refuses integration packages and requires bundled phonetic models. A restrictive Content Security Policy permits local assets and Tauri IPC rather than external scripts, fonts, images, frames, forms, or connections. Frontend guards block nonlocal fetch/XHR, WebSockets, EventSource, beacons, and popups. Native navigation is restricted to the app's internal origins; native popup requests are denied.

Native commands expose backup dialogs and fullscreen only. File paths come from user-operated native dialogs rather than arbitrary frontend path strings. Exports use temporary files and atomic replacement; imports have a 64 MiB limit. There are no shell, opener, HTTP, or general filesystem plugins exposed to the frontend. These runtime protections are unchanged by the removal of automated tests.

This describes application policy, not a promise that the OS or WebView2 never makes its own update or telemetry requests. Downloading dependencies and OS prerequisites also requires internet access.

## Upstream and license

Prepared against upstream commit `05a37bc5265f65ff538c59c613db29442f345d51`. The original `LICENSE` and copyright notices remain unchanged, and the build embeds an exact copy as `LICENSE.txt`. The adaptation uses the repository's existing license. This is an independent fork, not an official Keybr desktop release.

Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
