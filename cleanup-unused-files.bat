@echo off
echo.
echo ========================================
echo   Cleaning Up Unused Migration Files
echo ========================================
echo.

cd /d "%~dp0pawn-api"

echo 🧹 Removing outdated and unused migration files...

REM Remove old region category files we just cancelled
if exist add-region-categories-migration.sql (
    del add-region-categories-migration.sql
    echo ✅ Removed add-region-categories-migration.sql
)

if exist rollback-region-categories.sql (
    del rollback-region-categories.sql
    echo ✅ Removed rollback-region-categories.sql
)

REM Remove debug and check files (keeping essential ones)
echo.
echo 🔍 Removing debug and check files...

REM Remove old debugging files
for %%f in (
    debug-*.js
    test-*.js
    check-*.js
    verify-*.js
    api-test-*.js
    final-*.js
    recent-*.js
    constraint-*.js
) do (
    if exist "%%f" (
        del "%%f"
        echo ✅ Removed %%f
    )
)

REM Keep essential files but remove duplicates
echo.
echo 📋 Keeping essential files:
if exist server.js echo ✅ server.js (main API server)
if exist package.json echo ✅ package.json (dependencies)
if exist run-comprehensive-migration.js echo ✅ run-comprehensive-migration.js (database setup)
if exist seed-visayas-mindanao-cities-barangays.js echo ✅ seed-visayas-mindanao-cities-barangays.js (cities data)
if exist seed-item-descriptions.js echo ✅ seed-item-descriptions.js (item descriptions)
if exist migrate-database-schema.sql echo ✅ migrate-database-schema.sql (schema updates)

REM Remove temporary files
echo.
echo 🗑️ Removing temporary files...
if exist temp_*.txt del temp_*.txt >nul 2>&1
if exist *.log del *.log >nul 2>&1

echo.
echo ✅ Cleanup completed!
echo.
echo 📁 Essential files remaining:
echo    • server.js (main API server)
echo    • package.json (dependencies)
echo    • run-comprehensive-migration.js (database setup)
echo    • seed-*.js (data seeding)
echo    • migrate-database-schema.sql (schema updates)
echo    • routes/ (API endpoints)
echo    • config/ (configuration files)
echo    • middleware/ (authentication, etc.)
echo.
echo All debugging and temporary files removed.
echo.
pause