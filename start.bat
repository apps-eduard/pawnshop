@echo off
echo.
echo ========================================
echo    Starting Pawnshop Management System
echo ========================================
echo.

REM Check if setup has been run
if not exist "pawn-api\.env" (
    echo ERROR: System not set up yet!
    echo Please run setup.bat first.
    pause
    exit /b 1
)

echo Starting API server...
start "Pawnshop API" cmd /k "cd /d %~dp0pawn-api && npm start"

timeout /t 3 /nobreak >nul

echo Starting Web application...
start "Pawnshop Web" cmd /k "cd /d %~dp0pawn-web && ng serve"

echo.
echo Both servers are starting...
echo API Server: http://localhost:3000
echo Web App: http://localhost:4200
echo.
echo Wait a moment for both servers to fully start, then open:
echo http://localhost:4200
echo.
echo Press any key to exit this window...
pause >nul