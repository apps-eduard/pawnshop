# Setup.ps1 - Complete Database Reset & Setup

## 📋 What This Script Does

The `setup.ps1` script is the **master reset and setup tool** for the Pawnshop Management System. It performs a complete teardown and rebuild of the entire database.

## 🔄 Process Flow

```
1. Install Backend Dependencies (npm install)
   ↓
2. Rollback ALL Migrations (Drop all tables)
   ↓
3. Run Migrations (Create 24+ tables)
   ↓
4. Seed Database (Insert demo data)
   ↓
5. Install Frontend Dependencies
   ↓
6. Reset All Passwords to "password123"
   ↓
7. Verify Setup (Check tables & data)
```

## ✅ Updated Script Features

### Changes Made:
1. **Explicit Rollback** - Now runs `npx knex migrate:rollback --all` first
2. **Proper Sequencing** - Migrations → Seeds → Password Reset
3. **Better Messages** - Clear indication of each step
4. **Error Handling** - Validates each step before continuing

### What Gets Created:

#### 1. Database Tables (24+)
- employees, roles, menus, role_menu_permissions, employee_roles
- transactions, items, pawners
- categories, item_descriptions
- penalty_config, service_charge_brackets
- cities, barangays
- vouchers, audit_logs
- branches, branch_addresses
- queue_system, users_login_history

#### 2. Demo Users (All with password: `password123`)
- **admin** - Admin role
- **cashier1, cashier2** - Cashier role
- **manager1** - Manager role  
- **appraiser1, appraiser2** - Appraiser role
- **auctioneer1** - Auctioneer role
- **pawner1** - Pawner role (NEW!)

#### 3. Seed Data
- **Categories**: Jewelry (3% interest), Appliances (6% interest)
- **Penalty Config**: 2% per month, 3-day threshold
- **Service Charges**: 5 brackets (P1-P5)
- **Cities**: 27 cities in Philippines
- **Barangays**: 1200+ barangays
- **Item Descriptions**: 100+ pre-loaded items
- **RBAC**: 5 roles, 8+ menus with permissions

## 🚀 How to Use

### Run from Project Root:
```powershell
.\setup.ps1
```

### What You'll See:
```
=========================================================
 PAWNSHOP MANAGEMENT SYSTEM - COMPLETE SETUP
=========================================================

Checking prerequisites...
Prerequisites check passed!

Running complete setup script...
Setting up API dependencies...
Resetting database (rollback all migrations)...
Database rolled back successfully
Running Knex migrations...
Seeding database with initial data...
  - Creating admin tables and categories...
  - Creating core pawn shop tables...
  - Creating penalty config tables with seed data...
  - Creating service charge config tables with seed data...
  - Seeding cities and barangays data...
  - Seeding item descriptions...
  - Seeding demo employees and RBAC...
Setting up frontend dependencies...
Resetting employee passwords to default...
Verifying complete database setup...

=========================================================
 SETUP COMPLETED SUCCESSFULLY!
=========================================================
```

## 🎯 When to Use This Script

### ✅ Perfect For:
- **First-time installation**
- **Forgot all passwords** (resets to password123)
- **Database corruption** (complete reset)
- **Testing** (need clean slate)
- **After migration changes** (rebuild everything)
- **"relation does not exist" errors** (tables missing)

### ⚠️ WARNING - This Will:
- **DELETE ALL DATA** in the database
- Remove all transactions, pawners, items, users
- Reset to demo data only
- Cannot be undone

## 🔧 What Gets Reset

| Item | Action | Result |
|------|--------|--------|
| Database Tables | Dropped & Recreated | All 24+ tables fresh |
| Users | Deleted & Recreated | 8 demo users only |
| Passwords | Reset | All users: password123 |
| Transactions | Deleted | Empty (no history) |
| Pawners | Deleted | Empty (no customers) |
| Items | Deleted | Empty (no inventory) |
| Config Data | Recreated | Default settings |
| RBAC | Recreated | Default roles & permissions |

## 📝 After Running Setup

### 1. Start Backend
```powershell
cd pawn-api
npm start
```
✅ Server: http://localhost:3000

### 2. Start Frontend  
```powershell
cd pawn-web
ng serve
```
✅ App: http://localhost:4200

### 3. Check Health
```powershell
# Browser
http://localhost:3000/api/health
```

### 4. Login
```
Username: admin (or cashier1, manager1, etc.)
Password: password123
```

## 🐛 Troubleshooting

### Error: "relation items does not exist"
**Cause**: Migrations didn't complete  
**Solution**: Run `.\setup.ps1` again - it will rollback first

### Error: "Cannot login after setup"
**Cause**: Password hash issue  
**Solution**: 
```powershell
cd pawn-api
node reset-user-passwords.js
```

### Error: "Migration already applied"
**Solution**: Script now handles this - rolls back first

### Error: "Database connection failed"
**Solution**:
1. Check PostgreSQL is running
2. Verify `pawn-api/.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pawnshop_db
   DB_USER=postgres
   DB_PASSWORD=123
   ```

## 🔑 Default Credentials

After setup, all users have the same password:

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | Admin |
| cashier1 | password123 | Cashier |
| cashier2 | password123 | Cashier |
| manager1 | password123 | Manager |
| appraiser1 | password123 | Appraiser |
| appraiser2 | password123 | Appraiser |
| auctioneer1 | password123 | Auctioneer |
| pawner1 | password123 | Pawner |

## 🎓 Manual Operations (Advanced)

### Just Rollback Everything
```powershell
cd pawn-api
npx knex migrate:rollback --all
```

### Just Run Migrations
```powershell
cd pawn-api
npx knex migrate:latest
```

### Just Seed Data
```powershell
cd pawn-api
npx knex seed:run
```

### Just Reset Passwords
```powershell
cd pawn-api
node reset-user-passwords.js
```

### Full Reset (npm script)
```powershell
cd pawn-api
npm run reset-db
```

### Check Migration Status
```powershell
cd pawn-api
npx knex migrate:status
```

## ✨ Success Indicators

After successful setup:
- ✅ No errors in console
- ✅ "SETUP COMPLETED SUCCESSFULLY!" message
- ✅ Can access http://localhost:3000/api/health
- ✅ Health shows 8 employees, 0 transactions (fresh)
- ✅ Can login with any demo user
- ✅ All 24 tables exist in database

## 📚 Related Files

- `setup.ps1` - Main setup script (THIS FILE)
- `pawn-api/knexfile.js` - Knex configuration
- `pawn-api/migrations/*.js` - Database schema
- `pawn-api/seeds/*.js` - Seed data
- `pawn-api/reset-user-passwords.js` - Password reset utility
- `pawn-api/verify-complete-setup.js` - Setup verification
- `SETUP_USAGE_GUIDE.md` - Detailed usage guide

## 🔄 Script Updates Made

### Old Behavior:
```powershell
npx knex migrate:latest  # Could fail if already applied
npm run setup-db         # Ran migrations again (redundant)
```

### New Behavior:
```powershell
npx knex migrate:rollback --all  # Clean slate
npx knex migrate:latest          # Fresh migrations
npx knex seed:run                # Fresh seeds
node reset-user-passwords.js     # Reset passwords
```

### Benefits:
- ✅ Works on re-runs (idempotent)
- ✅ No "already applied" errors
- ✅ Clearer process flow
- ✅ Guaranteed clean state
- ✅ Better error messages

---

**Remember**: This script is destructive. It will delete all your data. Use for setup, testing, or recovery only!
