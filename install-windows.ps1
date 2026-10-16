[CmdletBinding()]
param([string]$Source, [string]$InstallDirectory, [switch]$NoLaunch)
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
$programs = [Environment]::GetFolderPath('Programs')
$shortcutPath = Join-Path $programs 'Keybr Desktop.lnk'
$shell = New-Object -ComObject WScript.Shell
$defaultDirectory = Join-Path $env:LOCALAPPDATA 'Programs\Keybr Desktop'
if (Test-Path -LiteralPath $shortcutPath) {
    $previousTarget = $shell.CreateShortcut($shortcutPath).TargetPath
    if ($previousTarget -and (Test-Path -LiteralPath $previousTarget -PathType Leaf)) {
        $defaultDirectory = Split-Path -Parent $previousTarget
    }
}
if (-not $InstallDirectory) {
    Write-Host 'Keybr Desktop will be installed as a standalone app and added to Start.'
    Write-Host 'Press Enter to use the folder below, or type a different full folder path.'
    Write-Host 'The default location is for your account. Protected folders may require administrator access.'
    $InstallDirectory = Read-Host "Install folder [$defaultDirectory]"
    if ([string]::IsNullOrWhiteSpace($InstallDirectory)) { $InstallDirectory = $defaultDirectory }
}
$destination = [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($InstallDirectory.Trim().Trim('"')))
if ($destination.TrimEnd('\') -eq $sourceDir.TrimEnd('\')) {
    throw 'Choose a different installation folder from the release folder so the installed app is independent of it.'
}
$executable = Join-Path $destination 'keybr-desktop.exe'
if (Get-Process -Name 'keybr-desktop' -ErrorAction SilentlyContinue) { throw 'Quit Keybr Desktop before installing or updating, then rerun this script.' }
if (-not (Test-Path -LiteralPath "$sourceDir\icon.ico")) { throw 'Keep icon.ico next to keybr-desktop.exe in the release folder.' }
New-Item -ItemType Directory -Force -Path $destination | Out-Null
# Stage first. A failed build/download never replaces an installed app.
Copy-Item -LiteralPath $Source -Destination "$executable.new" -Force
Move-Item -LiteralPath "$executable.new" -Destination $executable -Force
Copy-Item -LiteralPath "$sourceDir\icon.ico" -Destination "$destination\icon.ico" -Force
if (Test-Path -LiteralPath "$sourceDir\LICENSE.txt") { Copy-Item -LiteralPath "$sourceDir\LICENSE.txt" -Destination "$destination\LICENSE.txt" -Force }
New-Item -ItemType Directory -Force -Path $programs | Out-Null
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $executable
$shortcut.WorkingDirectory = $destination
$shortcut.IconLocation = "$destination\icon.ico"
$shortcut.Description = 'Your personal offline typing computer'
$shortcut.Save()
Write-Host "Installed: $executable"
Write-Host 'Open Keybr Desktop from Start. You can pin it to your taskbar. Updates preserve your progress.'
Write-Host 'The installed app does not need this source or release folder. Keep the installed folder and your app data.'
if (-not $NoLaunch) { Start-Process -FilePath $executable -WorkingDirectory $destination | Out-Null }
