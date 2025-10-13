# Fix RBAC Dynamic Menus

## Problem
The sidebar is showing static menus instead of dynamic menus from the database because:
1. The RBAC migration only assigned menu permissions to administrators
2. Other roles (cashier, manager, etc.) had no menu permissions

## Solution Applied

### 1. Updated Migration File
**File**: `pawn-api/migrations_knex/20251010120934_create_rbac_system.js`

**Changes**:
- Added proper menu permissions for ALL roles:
  - **Administrator**: All menus (Dashboard, Transactions, Pawner Management, Item Management, Reports, Vouchers, Settings, RBAC)
  - **Manager**: Dashboard, Transactions, Pawner Management, Item Management, Reports, Vouchers
  - **Cashier**: Dashboard, Transactions, Pawner Management
  - **Appraiser**: Dashboard, Reports
  - **Auctioneer**: Dashboard, Reports

### 2. Removed Static Menu Fallback
**File**: `pawn-web/src/app/shared/sidebar/sidebar.ts`

**Changes**:
- Cleared the `navigationItems` array (removed all 50+ static menu items)
- Now sidebar will **only use dynamic menus from database**

## Steps to Apply the Fix

Run these commands in order:

```powershell
# 1. Navigate to API folder
cd "X:\Programming 2025\pawnshop\pawn-api"

# 2. Rollback the last migration (to remove old incomplete data)
npx knex migrate:rollback

# 3. Run the migration again (with updated seed data)
npx knex migrate:latest

# 4. Verify the tables were created
npx knex migrate:status

# 5. Restart the API server
npm start
```

## Expected Result

After running these steps:

✅ **Administrator** should see:
- Dashboard
- Transactions
- Pawner Management
- Item Management
- Reports
- Vouchers
- Settings
- RBAC

✅ **Cashier** should see:
- Dashboard
- Transactions  
- Pawner Management

✅ **Manager** should see:
- Dashboard
- Transactions
- Pawner Management
- Item Management
- Reports
- Vouchers

## Verification

1. Log in as **cashier1** → Should see 3 menus (Dashboard, Transactions, Pawner Management)
2. Log in as **admin** → Should see all 8 menus
3. Console should show: `"✅ Loaded dynamic menus for user: X (Y)"` where Y is the number of menus
4. Console should show: `"🔄 Converted dashboard route for {role}: /dashboard/{role}"`

## Troubleshooting

If menus still don't show:

1. **Check database tables exist**:
   ```powershell
   node -e "const { pool } = require('./config/database'); pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_name IN (\'menu_items\', \'roles\', \'employee_roles\', \'role_menu_permissions\') ORDER BY table_name').then(r => { console.log(r.rows); process.exit(); });"
   ```

2. **Check menu items exist**:
   ```powershell
   node -e "const { pool } = require('./config/database'); pool.query('SELECT * FROM menu_items ORDER BY order_index').then(r => { console.log(r.rows); process.exit(); });"
   ```

3. **Check role permissions**:
   ```powershell
   node -e "const { pool } = require('./config/database'); pool.query('SELECT r.name as role, m.name as menu FROM role_menu_permissions rmp JOIN roles r ON rmp.role_id = r.id JOIN menu_items m ON rmp.menu_item_id = m.id ORDER BY r.name, m.order_index').then(r => { console.log(r.rows); process.exit(); });"
   ```

## Files Modified

1. ✅ `pawn-api/migrations_knex/20251010120934_create_rbac_system.js` - Fixed menu permissions for all roles
2. ✅ `pawn-web/src/app/shared/sidebar/sidebar.ts` - Removed static menu items
