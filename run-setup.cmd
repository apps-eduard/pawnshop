@echo off
:: Run PowerShell setup script
:: This wrapper ensures the PowerShell window stays open

echo Running PowerShell setup script...
echo.

powershell.exe -NoExit -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Setup failed. Press any key to exit...
    pause > nul
)
