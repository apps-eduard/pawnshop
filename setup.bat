@echo off
echo.
echo ========================================
echo    Pawnshop Management System Setup
echo ========================================
echo.

REM Check if PostgreSQL is installed and running
echo [1/8] Checking PostgreSQL installation...
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running or not installed!
    echo Please install PostgreSQL and make sure it's running.
    echo Download from: https://www.postgresql.org/download/
    pause
    exit /b 1
)
echo ✓ PostgreSQL is running

REM Check if Node.js is installed
echo.
echo [2/8] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js is installed

REM Navigate to API directory
echo.
echo [3/8] Setting up API dependencies...
cd /d "%~dp0pawn-api"
if not exist package.json (
    echo ERROR: package.json not found in pawn-api directory!
    pause
    exit /b 1
)

REM Install API dependencies
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install API dependencies!
    pause
    exit /b 1
)
echo ✓ API dependencies installed

REM Setup database
echo.
echo [4/8] Setting up database...
echo Please enter your PostgreSQL credentials:
set /p DB_HOST="Database Host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Database Port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_USER="Database User (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Database Password: "
if "%DB_PASSWORD%"=="" (
    echo ERROR: Database password is required!
    pause
    exit /b 1
)

set /p DB_NAME="Database Name (default: pawnshop_db): "
if "%DB_NAME%"=="" set DB_NAME=pawnshop_db

REM Create .env file
echo.
echo [5/8] Creating configuration file...
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
echo ✓ Configuration file created

REM Create database and run migrations
echo.
echo [6/8] Creating database and tables...

REM Test database connection first
echo Testing database connection...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Could not connect to PostgreSQL with provided credentials!
    echo Please check your PostgreSQL installation and credentials.
    pause
    exit /b 1
)

REM Create database if it doesn't exist
echo.
echo [6.1/8] Checking if database exists...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%';" -t -A | findstr /C:"1" >nul
if %errorlevel% equ 0 (
    echo ℹ️  Database '%DB_NAME%' already exists
) else (
    echo ⚠️  Database '%DB_NAME%' does not exist - creating now...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
    if %errorlevel% equ 0 (
        echo ✅ Database '%DB_NAME%' created successfully
    ) else (
        echo ❌ ERROR: Failed to create database '%DB_NAME%'
        pause
        exit /b 1
    )
)
echo ✓ Database ready

REM Run database setup script
echo.
echo [6.2/8] Setting up database schema and tables...
if exist database\setup.js (
    echo 🔧 Running database setup script...
    node database/setup.js
    if %errorlevel% equ 0 (
        echo ✅ Database schema and tables created successfully
    ) else (
        echo ❌ ERROR: Failed to setup database schema!
        pause
        exit /b 1
    )
) else (
    echo 🔧 Running migration script...
    node run-migration.js
    if %errorlevel% equ 0 (
        echo ✅ Database tables created via migration
    ) else (
        echo ❌ ERROR: Failed to create database tables!
        pause
        exit /b 1
    )
)

REM Verify tables were created
echo.
echo [6.3/8] Verifying created tables...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" -t -A | findstr /V "^$" > temp_tables.txt
if exist temp_tables.txt (
    echo ✅ Tables created successfully:
    for /f %%i in (temp_tables.txt) do echo    📋 %%i
    del temp_tables.txt
) else (
    echo ⚠️  No tables found or verification failed
)

REM Seed initial data
echo.
echo [7/8] Seeding initial data...

REM Add cities and barangays if script exists
echo.
echo [7.1/8] Seeding cities and barangays...
if exist create-cities-barangays.js (
    echo 🏙️  Adding Philippine cities and barangays...
    node create-cities-barangays.js
    if %errorlevel% equ 0 (
        echo ✅ Cities and barangays added successfully
        REM Count cities and barangays
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM cities;" -t -A > temp_city_count.txt
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM barangays;" -t -A > temp_barangay_count.txt
        set /p CITY_COUNT=<temp_city_count.txt
        set /p BARANGAY_COUNT=<temp_barangay_count.txt
        echo    📊 %CITY_COUNT% cities and %BARANGAY_COUNT% barangays added
        del temp_city_count.txt temp_barangay_count.txt 2>nul
    ) else (
        echo ⚠️  WARNING: Failed to add cities and barangays, continuing...
    )
) else (
    echo ⚠️  Skipping cities and barangays - script not found
)

REM Add sample users and pawners
echo.
echo [7.2/8] Seeding sample users and pawners...
echo 👥 Adding 6 user accounts and sample pawners...
node add-sample-data.js
if %errorlevel% equ 0 (
    echo ✅ Sample users and pawners added successfully
    REM Count employees and pawners
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM employees;" -t -A > temp_employee_count.txt
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM pawners;" -t -A > temp_pawner_count.txt
    set /p EMPLOYEE_COUNT=<temp_employee_count.txt
    set /p PAWNER_COUNT=<temp_pawner_count.txt
    echo    📊 %EMPLOYEE_COUNT% employees and %PAWNER_COUNT% pawners added
    del temp_employee_count.txt temp_pawner_count.txt 2>nul
) else (
    echo ❌ ERROR: Failed to add sample data!
    pause
    exit /b 1
)

REM Add sample transactions if script exists
if exist add-sample-transactions.js (
    echo Adding sample transactions...
    node add-sample-transactions.js
    if %errorlevel% neq 0 (
        echo WARNING: Failed to add sample transactions, continuing...
    )
) else (
    echo Skipping sample transactions - script not found
)

REM Fix address data if script exists
if exist fix-address-data.js (
    echo Fixing address data...
    node fix-address-data.js
    if %errorlevel% neq 0 (
        echo WARNING: Failed to fix address data, continuing...
    )
) else (
    echo Skipping address data fix - script not found
)

echo ✅ Initial data seeded successfully

REM Show database summary
echo.
echo [7.3/8] Database setup summary...
echo 📊 Database Setup Summary:
echo ┌─────────────────────────────────────────┐
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Tables: ' || COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t -A | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Cities: ' || COUNT(*) FROM cities;" -t -A 2>nul | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Barangays: ' || COUNT(*) FROM barangays;" -t -A 2>nul | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Employees: ' || COUNT(*) FROM employees;" -t -A 2>nul | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Pawners: ' || COUNT(*) FROM pawners;" -t -A 2>nul | findstr /V "^$"
echo └─────────────────────────────────────────┘

REM Setup frontend
echo.
echo [8/8] Setting up frontend...
cd /d "%~dp0pawn-web"
if not exist package.json (
    echo ERROR: package.json not found in pawn-web directory!
    pause
    exit /b 1
)

npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)
echo ✓ Frontend dependencies installed

REM Final success message
echo.
echo ========================================
echo          Setup Complete! 🎉
echo ========================================
echo.
echo Your Pawnshop Management System is ready!
echo.
echo Default Login Credentials:
echo ┌──────────────┬───────────────┬──────────────┐
echo │ Username     │ Password      │ Role         │
echo ├──────────────┼───────────────┼──────────────┤
echo │ ⚡ admin      │ admin123      │ administrator│
echo │ 👔 manager1   │ manager123    │ manager      │
echo │ 💰 cashier1   │ cashier123    │ cashier      │
echo │ 🔨 auctioneer1│ auctioneer123 │ auctioneer   │
echo │ 💎 appraiser1 │ appraiser123  │ appraiser    │
echo │ 👤 pawner1    │ pawner123     │ pawner       │
echo └──────────────┴───────────────┴──────────────┘
echo.
echo Sample Transaction Numbers for Testing:
echo • PT-2024-001, PT-2024-002, PT-2024-003, PT-2024-004, PT-2024-005
echo.
echo To start the system:
echo 1. Open two terminals
echo 2. In first terminal:  cd pawn-api    ^&^& npm start
echo 3. In second terminal: cd pawn-web    ^&^& npm start
echo 4. Open browser to:    http://localhost:4200
echo.
echo Press any key to exit...
pause >nul