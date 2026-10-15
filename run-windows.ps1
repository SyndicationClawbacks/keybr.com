# Run from PowerShell: powershell -ExecutionPolicy Bypass -File .\run-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Require-Command($name, $help) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name missing. $help" }
}
Require-Command node 'Install Node.js 26.9+.'
Require-Command npm 'Install Node.js with npm.'
Require-Command cargo 'Install Rust MSVC from https://rustup.rs/.'
Require-Command rustc 'Install Rust MSVC from https://rustup.rs/.'
$versionText = (& node -p 'process.versions.node')
if ($LASTEXITCODE -ne 0) { throw 'Node version check failed' }
$version = [version]$versionText
if ($version -lt [version]'26.9.0') { throw "Node.js 26.9+ required; found $versionText" }
Write-Host 'Windows requires Microsoft C++ Build Tools, Windows SDK and WebView2.'
Write-Host 'Installing Keybr dependencies...'
& npm.cmd ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
& npm.cmd install --prefix desktop --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Desktop npm install failed' }
Write-Host 'Starting Keybr Desktop...'
& npm.cmd --prefix desktop run dev
if ($LASTEXITCODE -ne 0) { throw 'Tauri desktop launch failed; check MSVC Build Tools, Windows SDK and WebView2 prerequisites' }
