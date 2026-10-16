[CmdletBinding()]
param([string]$Source, [switch]$NoLaunch)
$ErrorActionPreference = 'Stop'
# A portable Tauri executable uses the installed evergreen WebView2 runtime.
$webviewRoots = @(
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients',
    'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients',
    'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients'
)
$webview = @($webviewRoots | ForEach-Object {
    Get-ChildItem -LiteralPath $_ -ErrorAction SilentlyContinue | ForEach-Object {
        Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue
    }
} | Where-Object { $_.name -like '*WebView2*' -and $_.pv -and $_.pv -ne '0.0.0.0' })
if ($webview.Count -eq 0) {
    throw 'Install Microsoft Edge WebView2 Runtime from https://developer.microsoft.com/microsoft-edge/webview2/ then rerun this script.'
}
if (-not $Source) {
    $Source = Join-Path $PSScriptRoot 'keybr-desktop.exe'
    if (-not (Test-Path -LiteralPath $Source)) {
        $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
        $Source = Join-Path $PSScriptRoot "desktop\releases\Keybr-Desktop-Windows-$arch\keybr-desktop.exe"
        if (-not (Test-Path -LiteralPath $Source)) {
            & (Join-Path $PSScriptRoot 'build-desktop.ps1')
        }
    }
}
$Source = (Resolve-Path -LiteralPath $Source).Path
$sourceDir = Split-Path -Parent $Source
$destination = Join-Path $env:LOCALAPPDATA 'Programs\Keybr Desktop'
$executable = Join-Path $destination 'keybr-desktop.exe'
if (Get-Process -Name 'keybr-desktop' -ErrorAction SilentlyContinue) { throw 'Quit Keybr Desktop before installing or updating, then rerun this script.' }
if (-not (Test-Path -LiteralPath "$sourceDir\icon.ico")) { throw 'Keep icon.ico next to keybr-desktop.exe in the release folder.' }
New-Item -ItemType Directory -Force -Path $destination | Out-Null
# Stage first. A failed build/download never replaces an installed app.
Copy-Item -LiteralPath $Source -Destination "$executable.new" -Force
Move-Item -LiteralPath "$executable.new" -Destination $executable -Force
Copy-Item -LiteralPath "$sourceDir\icon.ico" -Destination "$destination\icon.ico" -Force
if (Test-Path -LiteralPath "$sourceDir\LICENSE.txt") { Copy-Item -LiteralPath "$sourceDir\LICENSE.txt" -Destination "$destination\LICENSE.txt" -Force }
$programs = [Environment]::GetFolderPath('Programs')
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $programs 'Keybr Desktop.lnk'))
$shortcut.TargetPath = $executable
$shortcut.WorkingDirectory = $destination
$shortcut.IconLocation = "$destination\icon.ico"
$shortcut.Description = 'Your personal offline typing computer'
$shortcut.Save()
Write-Host "Installed: $executable"
Write-Host 'Open Keybr Desktop from Start. You can pin it to your taskbar. Updates preserve your progress.'
if (-not $NoLaunch) { Start-Process -FilePath $executable -WorkingDirectory $destination | Out-Null }
