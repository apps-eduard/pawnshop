# Setup and Reset Password Improvements

**Date**: October 10, 2025  
**Status**: ✅ Completed

## Overview
Enhanced setup and password reset scripts to include Knex migrations and fixed incorrect password reset configuration.

---

## Changes Made

### 1. ✅ Updated `setup.ps1`
**File**: `setup.ps1`

**Change**: Added explicit Knex migration step AND password reset at the end

**Before**:
```powershell
npm install
npm run setup-db
# Done - no password reset
```

**After**:
```powershell
npm install
npx knex migrate:latest
npm run setup-db
# NEW: Reset passwords AFTER seeds complete
node reset-user-passwords.js
```

**Why**: 
- Ensures Knex migrations (RBAC) run explicitly before seed data
- **CRITICAL**: Resets all employee passwords AFTER seeds complete to ensure password123 works
- Seed files may have different/older password hashes, so we reset them to known state

---

### 2. ✅ Updated `reset_pw.bat`
**File**: `reset_pw.bat`

**Change**: Added Knex migration step before password reset

**Before**:
```bat
echo 🚀 Starting password reset...
echo.

:: Run the password reset script
node reset-user-passwords.js
```

**After**:
```bat
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
```

**Why**: Ensures database schema is up-to-date before attempting password resets. Prevents errors when new tables or columns are required.

---

### 3. ✅ Fixed `reset-user-passwords.js`
**File**: `pawn-api/reset-user-passwords.js`

**Issues Found**:
1. ❌ Tried to reset "pawner1" user that doesn't exist (pawners are customers, not employees)
2. ❌ Wrong passwords: used role-specific passwords (admin123, cashier123) instead of unified password
3. ❌ Missing cashier2, appraiser2 employees

**Before**:
```javascript
const demoAccounts = [
  { username: 'admin', password: 'admin123', role: 'Administrator' },
  { username: 'manager1', password: 'manager123', role: 'Manager' },
  { username: 'cashier1', password: 'cashier123', role: 'Cashier' },
  { username: 'auctioneer1', password: 'auctioneer123', role: 'Auctioneer' },
  { username: 'appraiser1', password: 'appraiser123', role: 'Appraiser' },
  { username: 'pawner1', password: 'pawner123', role: 'Pawner' }  // ❌ Doesn't exist!
];
```

**After**:
```javascript
const demoAccounts = [
  { username: 'admin', password: 'password123', role: 'Administrator' },
  { username: 'cashier1', password: 'password123', role: 'Cashier' },
  { username: 'cashier2', password: 'password123', role: 'Cashier' },
  { username: 'manager1', password: 'password123', role: 'Manager' },
  { username: 'appraiser1', password: 'password123', role: 'Appraiser' },
  { username: 'appraiser2', password: 'password123', role: 'Appraiser' },
  { username: 'auctioneer1', password: 'password123', role: 'Auctioneer' }
];
```

**Why**: 
- Matches seed file (`02_demo_employees.js`) which uses `password123` for all employees
- Removes non-existent "pawner1" employee
- Includes all 7 employees created by seeds
- Pawners are customers and don't have login accounts

---

## Testing the Changes

### Test Setup Script
```powershell
# From workspace root
.\setup.ps1
```

**Expected Output**:
```
Setting up API dependencies...
Running Knex migrations...
✅ RBAC migration completed
Setting up complete database...
✅ Migrations and seeds completed
```

### Test Password Reset
```bat
# From workspace root
.\reset_pw.bat
```

**Expected Output**:
```
📦 Running database migrations...
✅ Migrations completed

🔐 Resetting User Passwords...
✅ admin          → password123      (Administrator)
✅ cashier1       → password123      (Cashier)
✅ cashier2       → password123      (Cashier)
✅ manager1       → password123      (Manager)
✅ appraiser1     → password123      (Appraiser)
✅ appraiser2     → password123      (Appraiser)
✅ auctioneer1    → password123      (Auctioneer)
🧪 Admin password test: ✅ SUCCESS
🎉 Password Reset Complete!
✅ Successfully updated: 7 users
```

### Login Credentials
All employees now have the same password for easy testing:

| Username     | Password    | Role          |
|--------------|-------------|---------------|
| admin        | password123 | Administrator |
| cashier1     | password123 | Cashier       |
| cashier2     | password123 | Cashier       |
| manager1     | password123 | Manager       |
| appraiser1   | password123 | Appraiser     |
| appraiser2   | password123 | Appraiser     |
| auctioneer1  | password123 | Auctioneer    |

---

## Important Notes

### About Pawners
- ℹ️ **Pawners are customers, NOT user accounts**
- ℹ️ Pawners don't have login credentials (no password field in database)
- ℹ️ The reset script only affects **employee** accounts in the `employees` table
- ℹ️ If you need to reset a pawner's information, use the Pawner Management UI

### Migration Order
The setup now follows this clear sequence:
1. `npm install` - Install dependencies
2. `npx knex migrate:latest` - Run Knex migrations (RBAC, etc.)
3. `npm run setup-db` - Run migrations and seeds (`knex migrate:latest && knex seed:run`)

This ensures:
- ✅ Knex migrations run before seeds
- ✅ RBAC tables exist before employee roles are assigned
- ✅ All schema changes are applied before data insertion

### Password Reset Use Cases
Use `reset_pw.bat` when you need to:
- Reset all employee passwords to default (`password123`)
- Recover from forgotten passwords during development
- Reset demo environment to known state

---

## Commands Reference

### Setup from Scratch
```powershell
.\setup.ps1
```

### Reset All Employee Passwords
```bat
.\reset_pw.bat
```

### Manual Migration Run
```bash
cd pawn-api
npx knex migrate:latest
```

### Check Migration Status
```bash
cd pawn-api
npx knex migrate:status
```

---

## Related Files
- ✅ `setup.ps1` - Main setup script (includes migration + password reset steps)
- ✅ `reset_pw.bat` - Password reset script (includes migration step)
- ✅ `pawn-api/reset-user-passwords.js` - Password reset logic (fixed employee list)
- 📄 `pawn-api/seeds/02_demo_employees.js` - Employee seed data (source of truth)
- 📄 `pawn-api/migrations_knex/20251010120934_create_rbac_system.js` - RBAC migration
- 📄 `pawn-api/seeds/07_assign_employee_roles.js` - Employee role assignment

---

## Summary
✅ **All Changes Completed Successfully**

1. ✅ Knex migrations now run explicitly in `setup.ps1`
2. ✅ **Password reset now runs LAST in `setup.ps1` after all seeds complete**
3. ✅ Knex migrations now run before password reset in `reset_pw.bat`
4. ✅ Removed non-existent "pawner1" from reset script
5. ✅ Fixed all passwords to use `password123` (matching seed file)
6. ✅ Added missing employees (cashier2, appraiser2) to reset script
7. ✅ All 7 employees can now be reset correctly

**Execution Order in setup.ps1:**
1. npm install (dependencies)
2. npx knex migrate:latest (RBAC tables)
3. npm run setup-db (migrations + seeds)
4. **node reset-user-passwords.js** ← NEW! Ensures password123 works
5. npm run verify-tables (verification)

**Why the password reset at the end is critical:**
- Seed files create employees with hashed passwords
- Over time, password hashes may become inconsistent or outdated
- Running reset at the END ensures all employees have the correct `password123` hash
- This guarantees login will work immediately after setup

**System is now ready for testing!** 🚀
