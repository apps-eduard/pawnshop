@echo off
title Reset User Passwords - Goldwin Pawnshop
color 0A

echo.
echo ████████████████████████████████████████████████████████████████████████████████
echo █                                                                              █
echo █                    🔐 RESET USER PASSWORDS                                  █
echo █                      Goldwin Pawnshop System                               █
echo █                                                                              █
echo ████████████████████████████████████████████████████████████████████████████████
echo.

cd /d "%~dp0\pawn-api"

echo 📍 Current directory: %CD%
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo 💡 Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if package.json exists
if not exist "package.json" (
    echo ❌ package.json not found in pawn-api directory
    echo 💡 Make sure you're running this from the correct directory
    echo.
    pause
    exit /b 1
)

:: Check if the reset script exists
if not exist "reset-user-passwords.js" (
    echo ❌ reset-user-passwords.js not found
    echo 💡 The password reset script is missing
    echo.
    pause
    exit /b 1
)

echo 🚀 Starting password reset...
echo.

:: Run Knex migrations first
echo 📦 Running database migrations...
npx knex migrate:latest
if errorlevel 1 (
    echo ❌ Migration failed!
    echo 💡 Check the error messages above
    echo.
    pause
    exit /b 1
)
echo ✅ Migrations completed
echo.

:: Run the password reset script
node reset-user-passwords.js

:: Check if the command was successful
if errorlevel 1 (
    echo.
    echo ❌ Password reset failed!
    echo 💡 Check the error messages above for troubleshooting
) else (
    echo.
    echo ✅ Password reset completed successfully!
    echo 🎉 All users now have demo account passwords
)

echo.
echo ════════════════════════════════════════════════════════════════════════════════
echo.
pause