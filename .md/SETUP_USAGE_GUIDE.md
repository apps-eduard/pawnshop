# Setup Script Usage Guide

## Overview

The `setup.ps1` script is the **complete setup and reset tool** for the Pawnshop Management System. It performs a full database reset, migrations, seeding, and password reset.

## What `setup.ps1` Does

### 1. **Database Reset (Rollback All)**
- Removes all existing tables
- Clears all data
- Prepares for fresh migration

### 2. **Run Migrations**
- Creates all 24+ database tables
- Sets up table relationships
- Applies schema changes

### 3. **Seed Database**
- **Demo Employees**: admin, cashier1, cashier2, manager1, appraiser1, appraiser2, auctioneer1, pawner1
- **RBAC System**: 5 roles (admin, cashier, manager, appraiser, auctioneer, pawner), 8+ menus
- **Categories**: Jewelry, Appliances with loan rules
- **Penalty Config**: 2% monthly, 3-day threshold
- **Service Charges**: 5 brackets (P1-P5)
- **Cities & Barangays**: 27 cities, 1200+ barangays
- **Item Descriptions**: Pre-loaded item types

### 4. **Reset Passwords**
- All user passwords reset to: `password123`
- Works for: admin, cashier1, cashier2, manager1, appraiser1, appraiser2, auctioneer1, pawner1

### 5. **Install Dependencies**
- Backend (pawn-api): npm install
- Frontend (pawn-web): npm install

### 6. **Verify Setup**
- Checks all 24 tables exist
- Validates data counts

## When to Use `setup.ps1`

### ✅ **Use When:**
- **First time setup** - Initial installation
- **Forgot password** - Reset all user passwords to default
- **Database corrupted** - Complete database reset
- **Schema changes** - After migration updates
- **Testing** - Need clean slate with demo data
- **Migration issues** - Tables missing or broken

### ⚠️ **Warning:**
Running `setup.ps1` will:
- **Delete ALL data** in the database
- **Remove all transactions, pawners, items**
- **Reset to demo data only**

## Usage

### PowerShell (Recommended)
```powershell
# Run from project root
.\setup.ps1
```

### Command Line
```cmd
powershell -ExecutionPolicy Bypass -File setup.ps1
```

## After Running Setup

### 1. Start Backend
```powershell
cd pawn-api
npm start
```
Server runs on: http://localhost:3000

### 2. Start Frontend
```powershell
cd pawn-web
ng serve
```
Application runs on: http://localhost:4200

### 3. Login Credentials
All users have the same password: `password123`

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | password123 |
| Cashier | cashier1 | password123 |
| Cashier | cashier2 | password123 |
| Manager | manager1 | password123 |
| Appraiser | appraiser1 | password123 |
| Appraiser | appraiser2 | password123 |
| Auctioneer | auctioneer1 | password123 |
| Pawner | pawner1 | password123 |

### 4. Check Health
Browser: http://localhost:3000/api/health

## Troubleshooting

### "relation items does not exist"
**Cause**: Migrations didn't run or failed
**Solution**: Run `setup.ps1` again - it will rollback and recreate everything

### "Cannot login after setup"
**Cause**: Password hash issue or user not created
**Solution**: 
1. Run `setup.ps1` again
2. Or manually run: `cd pawn-api ; node reset-user-passwords.js`

### "Database connection failed"
**Cause**: PostgreSQL not running or wrong credentials
**Solution**:
1. Check PostgreSQL service is running
2. Verify credentials in `pawn-api/.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pawnshop_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

### "Setup failed with exit code"
**Solution**:
1. Run PowerShell as Administrator
2. Ensure PostgreSQL service is running
3. Check internet connection (for npm install)
4. Verify Node.js and PostgreSQL are in PATH

## Manual Database Operations

### Just Reset Database (no dependencies)
```powershell
cd pawn-api
npm run reset-db
```

### Just Reset Passwords
```powershell
cd pawn-api
node reset-user-passwords.js
```

### Just Run Migrations
```powershell
cd pawn-api
npx knex migrate:latest
```

### Just Run Seeds
```powershell
cd pawn-api
npx knex seed:run
```

### Rollback Last Migration
```powershell
cd pawn-api
npx knex migrate:rollback
```

### Check Migration Status
```powershell
cd pawn-api
npx knex migrate:status
```

## Database Structure After Setup

### Tables Created (24+)
- **Users & Auth**: employees, users_login_history
- **RBAC**: roles, menus, role_menu_permissions, employee_roles
- **Pawn Operations**: transactions, items, pawners
- **Configuration**: categories, item_descriptions, penalty_config, service_charge_brackets
- **Location**: cities, barangays
- **Reporting**: vouchers, audit_logs
- **Branches**: branches, branch_addresses

### Data Counts (Demo)
- Employees: 8 users
- Cities: 27
- Barangays: 1200+
- Categories: 2 (Jewelry, Appliances)
- Item Descriptions: 100+
- Roles: 5
- Menus: 8+

## Quick Reference

```powershell
# Complete setup (recommended)
.\setup.ps1

# Start application
cd pawn-api ; npm start
cd pawn-web ; ng serve

# Check health
# Browser: http://localhost:3000/api/health

# Default credentials
# Username: admin, cashier1, etc.
# Password: password123
```

## Important Notes

1. **Always run from project root** - Not from pawn-api or pawn-web directories
2. **Run PowerShell as Administrator** - Ensures proper permissions
3. **Backup data first** - If you have important data, export it before running
4. **Check .env file** - Ensure database credentials are correct
5. **PostgreSQL must be running** - Start PostgreSQL service before setup

## Success Indicators

After successful setup, you should see:
- ✅ "SETUP COMPLETED SUCCESSFULLY!" message
- ✅ "24 database tables created"
- ✅ "Demo accounts created with password: password123"
- ✅ Health check accessible at http://localhost:3000/api/health
- ✅ Login works with any demo user

## Need Help?

If setup fails:
1. Read the error message carefully
2. Check PostgreSQL is running
3. Verify .env credentials
4. Try running as Administrator
5. Check the troubleshooting section above
