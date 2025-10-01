# Pawnshop Management System - Complete Setup Script (PowerShell)
# This script sets up the entire pawnshop application with database

Write-Host "============================================================" -ForegroundColor Blue
Write-Host " PAWNSHOP MANAGEMENT SYSTEM - COMPLETE SETUP (PowerShell)" -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""

# Function to check if a command exists
function Test-CommandExists {
    param($command)
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists "node")) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-CommandExists "psql")) {
    Write-Host "ERROR: PostgreSQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Prerequisites check passed!" -ForegroundColor Green
Write-Host ""

# Run the main setup script
Write-Host "Running complete setup script..." -ForegroundColor Yellow
try {
    node setup-complete.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host " SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "To start the application:" -ForegroundColor Cyan
        Write-Host "1. Open a new terminal and run: cd pawn-api && npm start" -ForegroundColor Yellow
        Write-Host "2. Open another terminal and run: cd pawn-web && ng serve" -ForegroundColor Yellow
        Write-Host "3. Open http://localhost:4200 in your browser" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Demo accounts are ready to use (see details above)" -ForegroundColor Cyan
    } else {
        throw "Setup script failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " SETUP FAILED - Please check the error messages above" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues and solutions:" -ForegroundColor Yellow
    Write-Host "1. Ensure PostgreSQL service is running" -ForegroundColor White
    Write-Host "2. Check database credentials in pawn-api/.env" -ForegroundColor White
    Write-Host "3. Run PowerShell as Administrator if permission issues occur" -ForegroundColor White
    Write-Host "4. Ensure internet connection for package downloads" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"