# Desktop quick launch

On the `desktop/tauri-offline` branch, **`npm start` starts Keybr Desktop**, not the original website server. It selects the macOS shell launcher, the Windows PowerShell launcher, or the Linux desktop build commands. It requires only Node to dispatch; project dependencies are installed by the selected launcher.

After quitting any older Keybr Desktop instance, run these commands from the cloned repository:

```sh
git fetch origin
git switch desktop/tauri-offline
git pull --ff-only origin desktop/tauri-offline
npm start
```

The direct launchers are still available:

- macOS: `bash run-macos.sh`
- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File .\run-windows.ps1`

These run the app **from source**, not a prebuilt installer. They install npm dependencies on each invocation and require a local Rust/native toolchain. The initial Rust build can take several minutes; keep Terminal open while it builds and runs.

## macOS startup

The launcher immediately prints `[Keybr Desktop] Starting macOS launcher...` and identifies each stage. It keeps an already-runnable Node 26.9+ rather than loading nvm and switching to a potentially broken default. Only when a different Node version is needed does it load nvm with `--no-use`, select/install Node 26, or fall back to an existing Homebrew installation. No `set -e` or `set -u` is used around nvm; required build commands have explicit exit checks. On failure, the launcher reports the failed stage and exit status.

Install Xcode Command Line Tools (`xcode-select --install`) and Rust with rustup first. The launcher also looks for Rust in `~/.cargo/bin`. It does not install Xcode, Rust or a Node version manager for you. Node 26 and native build-tool support on Monterey must be checked separately from the application's macOS 12 deployment target; do not assume every current tool binary runs on macOS 12.

## Windows and Linux prerequisites

On Windows install Node.js 26.9+, Rust MSVC, Microsoft C++ Build Tools with Windows SDK, and WebView2. On Fedora install compatible Node, Rust, GTK3 and WebKitGTK 4.1 development packages. Follow `desktop/README.md` for native prerequisites and installer commands.

Windows NSIS `.exe` packaging is configured, but a successful installer has not been verified. To build one locally after installing dependencies: `npm --prefix desktop run build -- --bundles nsis`.

## Original website command

The former root `npm start` command is preserved as **`npm run start:web`**. That starts the upstream Node website server and requires its separate compiled output/configuration. A `Cannot find module './lib/index.js'` error from `root/index.js` belongs to that website entry point, not the Tauri app. Do not compile or configure the website just to launch the desktop app.

This update adds no GitHub Actions, automatic build triggers, or test suites. Local launcher checks used simulated tool commands and are not a native macOS/Windows validation. Saved application data is not cleared by the launcher.
