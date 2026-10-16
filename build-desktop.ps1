[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:HUSKY = '0'
if (Test-Path -LiteralPath "$env:USERPROFILE\.cargo\bin") { $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH" }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw 'Install Rust (MSVC) from https://rustup.rs/, then rerun. Also install Microsoft C++ Build Tools with the Desktop development with C++ workload.'
}
# Keep build-only Node inside this checkout; leave the system installation alone.
$nodeVersion = '26.9.0'
$nodeOK = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    & node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a===26&&b>=9?0:1)'
    $nodeOK = $LASTEXITCODE -eq 0
}
if (-not $nodeOK) {
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
    $name = "node-v$nodeVersion-win-$arch"
    $toolsDir = Join-Path $PSScriptRoot 'desktop\.tools'
    $nodeDir = Join-Path $toolsDir $name
    if (-not (Test-Path -LiteralPath "$nodeDir\node.exe")) {
        New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
        Write-Host "Downloading build-only Node $nodeVersion..."
        $base = "https://nodejs.org/dist/v$nodeVersion"
        Invoke-WebRequest "$base/SHASUMS256.txt" -OutFile "$toolsDir\SHASUMS256.txt" -UseBasicParsing
        Invoke-WebRequest "$base/$name.zip" -OutFile "$toolsDir\$name.zip" -UseBasicParsing
        $line = Get-Content -LiteralPath "$toolsDir\SHASUMS256.txt" | Where-Object { $_.EndsWith("  $name.zip") }
        if (-not $line) { throw 'No official Node checksum found.' }
        $expected = ($line -split '\s+')[0]
        if ((Get-FileHash -LiteralPath "$toolsDir\$name.zip" -Algorithm SHA256).Hash -ne $expected) { throw 'Node checksum mismatch.' }
        Expand-Archive -LiteralPath "$toolsDir\$name.zip" -DestinationPath $toolsDir -Force
    }
    $env:PATH = "$nodeDir;$env:PATH"
}
Write-Host 'Building the permanent app. The first build can take several minutes.'
& npm.cmd ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Repository dependency installation failed.' }
& npm.cmd ci --prefix desktop --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Desktop dependency installation failed.' }
& npm.cmd --prefix desktop run build:app
if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed. Check the error above and your C++ Build Tools/Windows SDK installation.' }
