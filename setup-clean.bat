@echo off
echo.
echo ========================================
echo    Pawnshop Management System Setup
echo ========================================
echo.

REM Check if PostgreSQL is installed and running
echo [1/6] Checking PostgreSQL installation...
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: PostgreSQL is not running or not installed!
    echo.
    echo 💡 Solutions:
    echo    1. INSTALL PostgreSQL: https://www.postgresql.org/download/windows/
    echo    2. START PostgreSQL service: services.msc
    echo    3. CHECK PATH: Add PostgreSQL bin to PATH
    echo    4. VERIFY: psql --version
    echo.
    pause
    exit /b 1
)
echo ✅ PostgreSQL is running and accessible

REM Check if Node.js is installed
echo.
echo [2/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Node.js is not installed!
    echo.
    echo 💡 Solutions:
    echo    1. INSTALL Node.js: https://nodejs.org/ (LTS version)
    echo    2. RESTART terminal after installation
    echo    3. VERIFY: node --version
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ Node.js %NODE_VERSION% and npm %NPM_VERSION% installed
)

REM Setup API dependencies
echo.
echo [3/6] Setting up API dependencies...
cd /d "%~dp0pawn-api"
if not exist package.json (
    echo ❌ ERROR: package.json not found in pawn-api directory!
    pause
    exit /b 1
)

echo 📦 Installing API dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to install API dependencies!
    pause
    exit /b 1
)
echo ✅ API dependencies installed successfully

REM Setup database
echo.
echo [4/6] Setting up database...
echo Please enter your PostgreSQL credentials:
set /p DB_HOST="Database Host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Database Port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_USER="Database User (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Database Password: "
if "%DB_PASSWORD%"=="" (
    echo ❌ ERROR: Database password is required!
    pause
    exit /b 1
)

set /p DB_NAME="Database Name (default: pawnshop): "
if "%DB_NAME%"=="" set DB_NAME=pawnshop

REM Create .env file
echo.
echo [4.1/6] Creating configuration file...
(
echo # Server Configuration
echo NODE_ENV=development
echo PORT=3000
echo CLIENT_URL=http://localhost:4200
echo.
echo # Database Configuration
echo DB_HOST=%DB_HOST%
echo DB_PORT=%DB_PORT%
echo DB_NAME=%DB_NAME%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo.
echo # JWT Configuration
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
echo JWT_EXPIRES_IN=24h
echo JWT_REFRESH_EXPIRES_IN=7d
echo.
echo # Email Configuration
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_USER=your-email@gmail.com
echo SMTP_PASS=your-app-password
echo.
echo # File Upload
echo MAX_FILE_SIZE=10485760
echo UPLOAD_PATH=./uploads
) > .env
echo ✅ Configuration file created

REM Test database connection
echo.
echo [4.2/6] Testing database connection...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1;" >nul 2>&1

if %errorlevel% neq 0 (
    echo ❌ ERROR: Could not connect to PostgreSQL!
    echo Check your credentials and PostgreSQL service status.
    pause
    exit /b 1
) else (
    echo ✅ Database connection successful!
)

REM Create database if it doesn't exist
echo.
echo [4.3/6] Creating database...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%';" -t -A | findstr /C:"1" >nul
if %errorlevel% equ 0 (
    echo ℹ️  Database '%DB_NAME%' already exists
) else (
    echo ⚠️  Creating database '%DB_NAME%'...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
    if %errorlevel% equ 0 (
        echo ✅ Database '%DB_NAME%' created successfully
    ) else (
        echo ❌ ERROR: Failed to create database '%DB_NAME%'
        pause
        exit /b 1
    )
)

REM Run essential database setup
echo.
echo [4.4/6] Setting up database schema...
echo 🔧 Running core database migration...

REM Apply the simplified schema migration
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrate-database-schema.sql >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Core schema migration completed
) else (
    echo ⚠️ Warning: Schema migration had issues, checking existing tables...
)

REM Run comprehensive migration for remaining tables
if exist run-comprehensive-migration.js (
    node run-comprehensive-migration.js >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Comprehensive migration completed
    ) else (
        echo ⚠️ Warning: Some migration steps failed, continuing...
    )
) else (
    echo ⚠️ Comprehensive migration script not found, skipping...
)

REM Seed essential data
echo.
echo [4.5/6] Seeding database with essential data...

REM Seed cities and barangays
if exist seed-visayas-mindanao-cities-barangays.js (
    echo 🏙️ Seeding cities and barangays...
    node seed-visayas-mindanao-cities-barangays.js >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Cities and barangays seeded
    ) else (
        echo ⚠️ Warning: Cities seeding failed, continuing...
    )
)

REM Seed item descriptions
if exist seed-item-descriptions.js (
    echo 💎 Seeding item descriptions...
    node seed-item-descriptions.js >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Item descriptions seeded
    ) else (
        echo ⚠️ Warning: Item descriptions seeding failed, continuing...
    )
)

echo ✅ Database setup completed!

REM Verify database setup
echo.
echo [4.6/6] Verifying database...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t -A > temp_table_count.txt 2>nul
if exist temp_table_count.txt (
    set /p TABLE_COUNT=<temp_table_count.txt
    echo ✅ Database contains %TABLE_COUNT% tables
    del temp_table_count.txt
) else (
    echo ⚠️ Could not verify table count
)

cd ..

REM Setup frontend
echo.
echo [5/6] Setting up frontend...
cd /d "%~dp0pawn-web"
if not exist package.json (
    echo ❌ ERROR: package.json not found in pawn-web directory!
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed successfully

cd ..

REM Final success message
echo.
echo ████████████████████████████████████████████████████████████
echo ███                                                      ███
echo ███           🎉 SETUP COMPLETED SUCCESSFULLY! 🎉        ███
echo ███                                                      ███
echo ████████████████████████████████████████████████████████████
echo.
echo 🏪 Your Pawnshop Management System is ready!
echo.
echo Default Login Credentials:
echo ┌──────────────┬───────────────┬──────────────┐
echo │ Username     │ Password      │ Role         │
echo ├──────────────┼───────────────┼──────────────┤
echo │ admin        │ admin123      │ administrator│
echo │ manager1     │ manager123    │ manager      │
echo │ cashier1     │ cashier123    │ cashier      │
echo │ auctioneer1  │ auctioneer123 │ auctioneer   │
echo │ appraiser1   │ appraiser123  │ appraiser    │
echo │ pawner1      │ pawner123     │ pawner       │
echo └──────────────┴───────────────┴──────────────┘
echo.
echo 🚀 HOW TO START:
echo    1. Double-click: start.bat
echo    2. Open browser: http://localhost:4200
echo.
echo 🌐 SYSTEM URLS:
echo    • Web App: http://localhost:4200
echo    • API:     http://localhost:3000
echo.
echo 💾 DATABASE: %DB_NAME% on %DB_HOST%:%DB_PORT%
echo.
echo ✅ Setup completed - Press any key to exit
pause >nul