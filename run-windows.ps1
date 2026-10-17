[CmdletBinding()]
param([switch]$Rebuild, [switch]$NoLaunch)
$ErrorActionPreference = 'Stop'
$app = Join-Path $env:LOCALAPPDATA 'Programs\Keybr Desktop\keybr-desktop.exe'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Programs')) 'Keybr Desktop.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
    $shell = New-Object -ComObject WScript.Shell
    $installedTarget = $shell.CreateShortcut($shortcutPath).TargetPath
    if ($installedTarget -and (Test-Path -LiteralPath $installedTarget -PathType Leaf)) { $app = $installedTarget }
}
if ($Rebuild) { & (Join-Path $PSScriptRoot 'build-desktop.ps1') }
if ($Rebuild -or -not (Test-Path -LiteralPath $app)) {
    & (Join-Path $PSScriptRoot 'install-windows.ps1') -NoLaunch:$NoLaunch
} elseif (-not $NoLaunch) {
    Start-Process -FilePath $app -WorkingDirectory (Split-Path -Parent $app) | Out-Null
}
