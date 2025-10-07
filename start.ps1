# PowerShell script to start the Pawnshop Management System
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Pawnshop Management System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if setup has been run
if (-Not (Test-Path "pawn-api\.env")) {
    Write-Host "ERROR: System not set up yet!" -ForegroundColor Red
    Write-Host "Please run setup.ps1 first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting API server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'pawn-api'; npm start" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Web application..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'pawn-web'; ng serve" -WindowStyle Normal

Write-Host ""
Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host "API Server: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Web App: http://localhost:4200" -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait a moment for both servers to fully start, then open:" -ForegroundColor Cyan
Write-Host "http://localhost:4200" -ForegroundColor White -BackgroundColor Blue
Write-Host ""
Read-Host "Press Enter to exit this window"