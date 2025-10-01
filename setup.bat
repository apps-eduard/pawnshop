@echo off
echo ============================================================
echo  PAWNSHOP MANAGEMENT SYSTEM - COMPLETE SETUP (Windows)
echo ============================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo Running complete setup script...
node setup-complete.js

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo  SETUP COMPLETED SUCCESSFULLY!
    echo ============================================================
    echo.
    echo To start the application:
    echo 1. Open a new terminal and run: cd pawn-api ^&^& npm start
    echo 2. Open another terminal and run: cd pawn-web ^&^& ng serve
    echo 3. Open http://localhost:4200 in your browser
    echo.
) else (
    echo.
    echo ============================================================
    echo  SETUP FAILED - Please check the error messages above
    echo ============================================================
    echo.
)

pause