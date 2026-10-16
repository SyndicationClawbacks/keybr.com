@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
if errorlevel 1 (
    echo.
    echo Keybr could not be installed. Please read the message above.
    pause
)
