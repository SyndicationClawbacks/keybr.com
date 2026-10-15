# Desktop quick launch

These scripts run the Tauri desktop app **from source**, not a prebuilt installer. They install npm dependencies on each invocation and require a local Rust/native toolchain. Run them from the `desktop/tauri-offline` branch.

- macOS (Intel or Apple Silicon, including Monterey): `bash run-macos.sh`
- Windows PowerShell: `powershell -ExecutionPolicy Bypass -File .\run-windows.ps1`

For macOS, install Xcode Command Line Tools (`xcode-select --install`), Node.js **26.9+**, and Rust (`rustup`). Node 26 availability on Monterey depends on the distributor; do not assume Homebrew supplies a compatible binary. On Windows install Node.js 26.9+, Rust MSVC, Microsoft C++ Build Tools with Windows SDK, and WebView2. Follow `desktop/README.md` for native installer commands.

Windows **NSIS .exe installer is configured**, but no successful installer build has been verified. To build one locally after prerequisites: `npm --prefix desktop run build -- --bundles nsis`. The optional GitHub packaging workflow is **manual only**, without tests or automatic triggers.

The scripts do not add GitHub workflows or run smoke tests. macOS 12 runtime compatibility and native packaging remain unverified.
