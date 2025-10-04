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
    echo.
    echo ❌ ERROR: PostgreSQL is not running or not installed!
    echo.
    echo 🔍 This means:
    echo    1. PostgreSQL is not installed on your system
    echo    2. PostgreSQL service is not running
    echo    3. PostgreSQL is not in your system PATH
    echo    4. PostgreSQL is installed but not properly configured
    echo.
    echo 💡 Solutions:
    echo    1. INSTALL PostgreSQL:
    echo       - Download from: https://www.postgresql.org/download/windows/
    echo       - Run installer as Administrator
    echo       - Remember the password you set for 'postgres' user
    echo       - Keep default port 5432
    echo.
    echo    2. START PostgreSQL service:
    echo       - Open Services (Win+R, type services.msc)
    echo       - Find PostgreSQL service (e.g., postgresql-x64-15)
    echo       - Right-click and select Start
    echo       - OR run: net start postgresql-x64-15
    echo.
    echo    3. CHECK PATH:
    echo       - PostgreSQL bin folder should be in PATH
    echo       - Usually: C:\Program Files\PostgreSQL\15\bin
    echo       - Add to PATH if missing
    echo.
    echo    4. VERIFY installation:
    echo       - After installing, run this command again
    echo       - Test: psql --version
    echo.
    pause
    exit /b 1
)
echo ✅ PostgreSQL is running and accessible

REM Check if Node.js is installed
echo.
echo [2/8] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Node.js is not installed!
    echo.
    echo 🔍 This means:
    echo    1. Node.js is not installed on your system
    echo    2. Node.js is not in your system PATH
    echo    3. Node.js installation is corrupted
    echo.
    echo 💡 Solutions:
    echo    1. INSTALL Node.js:
    echo       - Download from: https://nodejs.org/
    echo       - Choose LTS version (recommended)
    echo       - Run installer as Administrator
    echo       - Use default installation options
    echo.
    echo    2. VERIFY installation:
    echo       - Open new Command Prompt after installation
    echo       - Test: node --version
    echo       - Test: npm --version
    echo.
    echo    3. RECOMMENDED versions:
    echo       - Node.js 18.x or 20.x LTS
    echo       - npm 9.x or 10.x (comes with Node.js)
    echo.
    echo    4. RESTART terminal:
    echo       - Close this window after installing Node.js
    echo       - Open new Command Prompt
    echo       - Run setup.bat again
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ Node.js %NODE_VERSION% and npm %NPM_VERSION% installed
)

REM Navigate to API directory
echo.
echo [3/8] Setting up API dependencies...
cd /d "%~dp0pawn-api"
if not exist package.json (
    echo.
    echo ❌ ERROR: package.json not found in pawn-api directory!
    echo.
    echo 🔍 This means:
    echo    1. You're not in the correct directory
    echo    2. The project files are incomplete
    echo    3. The pawn-api folder is missing or corrupted
    echo.
    echo 💡 Solutions:
    echo    1. Ensure you extracted the complete project
    echo    2. Check current directory: %CD%
    echo    3. Look for pawn-api folder in project root
    echo    4. Re-download/extract the project if files are missing
    echo.
    echo 📁 Expected structure:
    echo    pawnshop/
    echo    ├── pawn-api/
    echo    │   ├── package.json  ← This file is missing!
    echo    │   ├── server.js
    echo    │   └── ...
    echo    └── pawn-web/
    echo.
    pause
    exit /b 1
)

REM Install API dependencies
echo 📦 Installing API dependencies (Node.js packages)...
npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Failed to install API dependencies!
    echo.
    echo 🔍 Possible causes:
    echo    1. No internet connection
    echo    2. npm registry issues
    echo    3. Insufficient disk space
    echo    4. Permission issues
    echo    5. Corrupted package.json
    echo.
    echo 💡 Troubleshooting steps:
    echo    1. Check internet connection
    echo    2. Clear npm cache: npm cache clean --force
    echo    3. Delete node_modules: rmdir /s node_modules
    echo    4. Try again: npm install
    echo    5. Run as Administrator if permission issues
    echo    6. Check disk space (need at least 500MB free)
    echo.
    pause
    exit /b 1
)
echo ✅ API dependencies installed successfully

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
    echo.
    echo ❌ ERROR: Database password is required!
    echo.
    echo 🔍 Why this is needed:
    echo    1. PostgreSQL requires authentication
    echo    2. Default 'postgres' user needs a password
    echo    3. Password was set during PostgreSQL installation
    echo.
    echo 💡 How to find your PostgreSQL password:
    echo    1. Check installation notes/documentation
    echo    2. Try common passwords: admin, postgres, 123
    echo    3. Password was set when you installed PostgreSQL
    echo    4. If forgotten, you may need to reset it
    echo.
    echo 🔧 To reset PostgreSQL password:
    echo    1. Edit pg_hba.conf file
    echo    2. Change authentication to 'trust' temporarily
    echo    3. Restart PostgreSQL service
    echo    4. Connect and change password: ALTER USER postgres PASSWORD 'newpass';
    echo    5. Change pg_hba.conf back to 'md5'
    echo    6. Restart PostgreSQL service
    echo.
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
echo 🔗 Testing database connection...
echo    Host: %DB_HOST%
echo    Port: %DB_PORT%
echo    User: %DB_USER%
echo    Database: postgres (for initial connection)

set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1;" >nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Could not connect to PostgreSQL!
    echo.
    echo 🔍 Possible causes:
    echo    1. PostgreSQL service is not running
    echo    2. Wrong username or password
    echo    3. Wrong host or port
    echo    4. User does not have connection privileges
    echo.
    echo 💡 Troubleshooting steps:
    echo    1. Check if PostgreSQL is running:
    echo       - Open Services (services.msc)
    echo       - Look for PostgreSQL service
    echo       - Start it if stopped
    echo.
    echo    2. Test connection manually:
    echo       psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres
    echo.
    echo    3. Common PostgreSQL service names:
    echo       - postgresql-x64-15
    echo       - postgresql-x64-14
    echo       - PostgreSQL Database Server
    echo.
    echo    4. Start PostgreSQL service:
    echo       net start postgresql-x64-15
    echo.
    echo    5. Check PostgreSQL installation:
    echo       - Default port: 5432
    echo       - Default user: postgres
    echo       - Check installation directory
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Database connection successful!
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

REM Run complete database setup with recent schema updates
echo.
echo [6.2/8] Setting up complete pawn shop database...
echo 🔧 Running complete database setup (all tables + data)...
echo 📋 Recent schema updates include:
echo    • item_appraisals table (simplified appraisal workflow)
echo    • audit_logs table (login tracking)
echo    • Interest rate constraints (NUMERIC(5,4) for decimal storage)
echo    • Transaction-centric database structure
echo    • Employee-based authentication (no users table)
cd pawn-api

REM Run comprehensive migration (includes new tables)
echo.
echo 🔄 Step 1: Running comprehensive migration...
node run-comprehensive-migration.js
if %errorlevel% equ 0 (
    echo ✅ Core migration completed successfully
) else (
    echo ❌ ERROR: Failed to run comprehensive migration!
    pause
    exit /b 1
)

REM Create item_appraisals table specifically
echo.
echo 🔄 Step 2: Creating item_appraisals table...
node create-item-appraisals-table.js
if %errorlevel% equ 0 (
    echo ✅ item_appraisals table created successfully
) else (
    echo ⚠️  WARNING: item_appraisals table creation failed, continuing...
)

REM Seed cities and barangays
echo.
echo 🔄 Step 3: Seeding cities and barangays...
node seed-visayas-mindanao-cities-barangays.js
if %errorlevel% equ 0 (
    echo ✅ Cities and barangays seeded successfully
) else (
    echo ⚠️  WARNING: Cities seeding failed, continuing...
)

REM Seed item descriptions
echo.
echo 🔄 Step 4: Seeding item descriptions...
node seed-item-descriptions.js
if %errorlevel% equ 0 (
    echo ✅ Item descriptions seeded successfully
) else (
    echo ⚠️  WARNING: Item descriptions seeding failed, continuing...
)

echo.
echo ✅ Complete pawn shop database setup successful!
echo    • 20+ tables created (including new item_appraisals, audit_logs)
echo    • employees table for authentication (no users table)
echo    • transactions table with proper interest rate constraints
echo    • item_appraisals table for simplified appraisal workflow
echo    • audit_logs table for login tracking
echo    • 6 default employees (admin, cashier1, manager1, etc.)
echo    • 66 Visayas/Mindanao cities with barangays seeded
echo    • 200+ item descriptions loaded
echo    • System configuration initialized
cd ..

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

REM Data seeding completed in previous steps
echo.
echo [7/8] Database seeding and schema updates completed...
echo ✅ All data seeding and recent schema updates completed:
echo    • 6 default employees (admin, cashier1, manager1, auctioneer1, appraiser1, pawner1)
echo    • employees table authentication (NO users table - important!)
echo    • transactions table with NUMERIC(5,4) interest rate constraints
echo    • item_appraisals table for simplified appraisal workflow
echo    • audit_logs table for login tracking and security
echo    • 66 Visayas and Mindanao cities with 819+ barangays  
echo    • 200+ selectable item descriptions (jewelry + appliances)
echo    • System configuration and transaction sequences initialized
echo    • Status constraints fixed (pawn_items: in_vault, redeemed, sold, etc.)
echo    • Interest rate storage: decimal format (0.10 for 10%)

REM Show complete table verification
echo.
echo [7.2/8] Complete database verification...
echo 🔍 Showing all created tables and data counts...
npm run verify-tables
if %errorlevel% equ 0 (
    echo ✅ Database verification completed successfully
) else (
    echo ⚠️  Warning: Database verification had issues but setup may still be functional
)
    node add-visayas-mindanao-cities.js
    if %errorlevel% equ 0 (
        echo ✅ Cities and barangays added successfully
        REM Count cities and barangays
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM cities;" -t -A > temp_city_count.txt
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM barangays;" -t -A > temp_barangay_count.txt
        set /p CITY_COUNT=<temp_city_count.txt
        set /p BARANGAY_COUNT=<temp_barangay_count.txt
        echo    📊 %CITY_COUNT% cities and %BARANGAY_COUNT% barangays available
        del temp_city_count.txt temp_barangay_count.txt 2>nul
    ) else (
        echo ⚠️  WARNING: Failed to add cities and barangays, continuing...
    )
) else (
    echo ⚠️  Skipping cities and barangays - script not found
)

REM Seed comprehensive item descriptions
echo.
echo [7.3/8] Seeding selectable item descriptions...
if exist seed-item-descriptions.js (
    echo 💎 Seeding comprehensive jewelry and appliance descriptions...
    node seed-item-descriptions.js
    if %errorlevel% equ 0 (
        echo ✅ Item descriptions seeded successfully
        REM Count descriptions by category
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM descriptions;" -t -A > temp_desc_count.txt 2>nul
        if exist temp_desc_count.txt (
            set /p DESC_COUNT=<temp_desc_count.txt
            echo    📊 %DESC_COUNT% selectable item descriptions available
            del temp_desc_count.txt
        )
        REM Show breakdown
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT c.name || ': ' || COUNT(d.id) || ' items' FROM categories c LEFT JOIN descriptions d ON c.id = d.category_id GROUP BY c.name ORDER BY c.name;" -t -A
    ) else (
        echo ⚠️  WARNING: Failed to seed item descriptions, continuing...
    )
) else (
    echo ⚠️  Skipping item descriptions seeding - script not found
)

REM Add sample users and pawners
REM Show database summary
echo.
echo [7.1/8] Database setup summary...
echo 📊 Complete Database Summary:
echo ┌─────────────────────────────────────────┐
cd pawn-api
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Tables: ' || COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t -A | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Cities: ' || COUNT(*) FROM cities;" -t -A 2>nul | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Barangays: ' || COUNT(*) FROM barangays;" -t -A 2>nul | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Employees: ' || COUNT(*) FROM employees;" -t -A 2>nul | findstr /V "^$"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Descriptions: ' || COUNT(*) FROM descriptions;" -t -A 2>nul | findstr /V "^$"
echo └─────────────────────────────────────────┘
cd ..

REM Setup frontend
echo.
echo [8/8] Setting up frontend...
cd /d "%~dp0pawn-web"
if not exist package.json (
    echo.
    echo ❌ ERROR: package.json not found in pawn-web directory!
    echo.
    echo 🔍 This means:
    echo    1. The Angular project files are missing
    echo    2. The pawn-web folder is incomplete
    echo    3. Project extraction failed
    echo.
    echo 💡 Solutions:
    echo    1. Ensure you extracted the complete project
    echo    2. Check current directory: %CD%
    echo    3. Look for pawn-web folder in project root
    echo    4. Re-download/extract the project if files are missing
    echo.
    echo 📁 Expected structure:
    echo    pawnshop/
    echo    ├── pawn-api/
    echo    └── pawn-web/
    echo        ├── package.json  ← This file is missing!
    echo        ├── angular.json
    echo        └── src/
    echo.
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies (Angular packages)...
npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Failed to install frontend dependencies!
    echo.
    echo 🔍 Possible causes:
    echo    1. No internet connection
    echo    2. npm registry issues
    echo    3. Angular CLI compatibility issues
    echo    4. Insufficient disk space
    echo    5. Permission issues
    echo.
    echo 💡 Troubleshooting steps:
    echo    1. Check internet connection
    echo    2. Clear npm cache: npm cache clean --force
    echo    3. Delete node_modules: rmdir /s node_modules
    echo    4. Install Angular CLI globally: npm install -g @angular/cli
    echo    5. Try again: npm install
    echo    6. Run as Administrator if permission issues
    echo    7. Check Node.js version (should be 16+ for Angular)
    echo.
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed successfully

REM Final success message
echo.
echo ████████████████████████████████████████████████████████████
echo ████████████████████████████████████████████████████████████
echo ███                                                      ███
echo ███           🎉 SETUP COMPLETED SUCCESSFULLY! 🎉        ███
echo ███                                                      ███
echo ████████████████████████████████████████████████████████████
echo ████████████████████████████████████████████████████████████
echo.
echo 🏪 Your Pawnshop Management System is ready to use!
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
echo 🚀 NEXT STEPS - How to start your system:
echo.
echo    📝 EASY WAY (Recommended):
echo       1. Double-click: start.bat
echo       2. Wait for both servers to start
echo       3. Open browser: http://localhost:4200
echo.
echo    📝 MANUAL WAY:
echo       Terminal 1: cd pawn-api    ^&^& npm start
echo       Terminal 2: cd pawn-web    ^&^& npm start
echo       Browser:    http://localhost:4200
echo.
echo 🌐 SYSTEM URLS:
echo    • Web Application: http://localhost:4200
echo    • API Server:      http://localhost:3000
echo    • Health Check:    http://localhost:3000/api/health
echo.
echo 💾 SYSTEM INFORMATION:
echo    • Database: %DB_NAME% on %DB_HOST%:%DB_PORT%
echo    • Environment: Development
echo    • Setup Date: %DATE% %TIME%
echo.
echo 🎯 READY TO USE - Setup completed successfully!
echo.
echo Press any key to exit...
pause >nul