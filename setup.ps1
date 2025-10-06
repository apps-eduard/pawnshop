# Pawnshop Management System - Complete Setup Script
$ErrorActionPreference = "Stop"
$OriginalLocation = Get-Location

Write-Host "=========================================================" -ForegroundColor Blue
Write-Host " PAWNSHOP MANAGEMENT SYSTEM - COMPLETE SETUP" -ForegroundColor Blue
Write-Host "=========================================================" -ForegroundColor Blue
Write-Host ""

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

Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists "node")) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-CommandExists "psql")) {
    Write-Host "ERROR: PostgreSQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Prerequisites check passed!" -ForegroundColor Green
Write-Host ""

try {
    Write-Host "Running complete setup script..." -ForegroundColor Yellow
    
    Write-Host "Setting up API dependencies..." -ForegroundColor Cyan
    Set-Location "pawn-api"
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Failed to install API dependencies" }

    Write-Host "Setting up complete database..." -ForegroundColor Cyan
    Write-Host "  - Creating admin tables and categories..." -ForegroundColor Gray
    Write-Host "  - Creating core pawn shop tables..." -ForegroundColor Gray
    Write-Host "  - Creating penalty config tables with seed data..." -ForegroundColor Gray
    Write-Host "  - Creating service charge config tables with seed data..." -ForegroundColor Gray
    Write-Host "  - Seeding cities and barangays data..." -ForegroundColor Gray
    Write-Host "  - Seeding item descriptions..." -ForegroundColor Gray
    npm run setup-db
    if ($LASTEXITCODE -ne 0) { throw "Failed to setup database" }

    Set-Location ".."

    Write-Host "Setting up frontend dependencies..." -ForegroundColor Cyan
    Set-Location "pawn-web"
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Failed to install frontend dependencies" }

    Set-Location ".."

    Write-Host "Verifying complete database setup..." -ForegroundColor Cyan
    Set-Location "pawn-api"
    npm run verify-tables
    $verifyExitCode = $LASTEXITCODE
    Set-Location ".."

    if ($verifyExitCode -eq 0) {
        Write-Host ""
        Write-Host "=========================================================" -ForegroundColor Green
        Write-Host " SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "=========================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database Setup Summary:" -ForegroundColor Cyan
        Write-Host "  * 24 database tables created" -ForegroundColor Green
        Write-Host "  * Transactions table with granted_date and partial payment support (6 new fields)" -ForegroundColor Green
        Write-Host "  * Categories and loan rules seeded" -ForegroundColor Green
        Write-Host "  * Penalty config seeded (2 percent monthly, 3-day threshold)" -ForegroundColor Green
        Write-Host "  * Service charge brackets seeded (P1-P5)" -ForegroundColor Green
        Write-Host "  * Cities and barangays data seeded" -ForegroundColor Green
        Write-Host "  * Item descriptions seeded" -ForegroundColor Green
        Write-Host "  * Demo accounts created" -ForegroundColor Green
        Write-Host ""
        Write-Host "To start the application:" -ForegroundColor Cyan
        Write-Host "1. Terminal 1: cd pawn-api; npm start" -ForegroundColor Yellow
        Write-Host "2. Terminal 2: cd pawn-web; ng serve" -ForegroundColor Yellow
        Write-Host "3. Browser: http://localhost:4200" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
    } else {
        throw "Database verification failed with exit code $verifyExitCode"
    }
}
catch {
    Set-Location $OriginalLocation
    
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Red
    Write-Host " SETUP FAILED - Check errors above" -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "1. Ensure PostgreSQL service is running" -ForegroundColor White
    Write-Host "2. Check database credentials in pawn-api/.env" -ForegroundColor White
    Write-Host "3. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "4. Ensure internet connection" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $OriginalLocation
