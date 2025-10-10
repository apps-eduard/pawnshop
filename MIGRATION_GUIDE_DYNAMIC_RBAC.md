# Dynamic Menu & RBAC System - Migration Guide

## Migration Files Created

### 1. Standard Node.js Migration
**File:** `migrations/create-dynamic-menu-rbac-system.js`
- Standalone script using pg pool
- Run: `node migrations/create-dynamic-menu-rbac-system.js`

### 2. Knex-Compatible Migration  
**File:** `migrations/knex-create-dynamic-menu-rbac-system.js`
- Compatible with Knex migration system
- Includes `up()` and `down()` functions
- Run: `node migrations/knex-create-dynamic-menu-rbac-system.js`
- Or if using Knex CLI: `npx knex migrate:latest`

## Running the Migration

### Option 1: Run Directly (Recommended)
```bash
cd pawn-api
node migrations/knex-create-dynamic-menu-rbac-system.js
```

### Option 2: Via npm script (if configured)
```bash
cd pawn-api
npm run migrate
```

### Option 3: Using Knex CLI (if knex is configured)
```bash
cd pawn-api
npx knex migrate:latest
```

## What Gets Created

### Tables (4 new tables):
1. **menu_items** - Stores sidebar menu definitions
2. **roles** - Defines available roles (system + custom)
3. **role_menu_permissions** - Controls which roles can access which menus
4. **employee_roles** - Many-to-many: employees ↔ roles

### Seed Data:
- 7 default roles (admin, administrator, manager, cashier, auctioneer, appraiser, pawner)
- 18 menu items (all current sidebar items)
- Default permissions for each role
- Migrated existing employee roles to new system

### Indexes:
- Performance indexes on foreign keys
- Composite indexes for common queries

## Rollback

To undo the migration:

```javascript
// In migrations/knex-create-dynamic-menu-rbac-system.js
const { down } = require('./migrations/knex-create-dynamic-menu-rbac-system');
down().then(() => process.exit(0));
```

Or manually:
```sql
DROP TABLE IF EXISTS employee_roles CASCADE;
DROP TABLE IF EXISTS role_menu_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
```

## Verification

After running migration, verify tables exist:

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('menu_items', 'roles', 'role_menu_permissions', 'employee_roles');

-- Check roles
SELECT * FROM roles;

-- Check menu items count
SELECT COUNT(*) FROM menu_items;

-- Check permissions
SELECT COUNT(*) FROM role_menu_permissions;

-- Check migrated employee roles
SELECT 
  e.username, 
  r.display_name, 
  er.is_primary 
FROM employee_roles er
JOIN employees e ON er.employee_id = e.id
JOIN roles r ON er.role_id = r.id;
```

## Troubleshooting

### Error: "Table already exists"
- Migration is idempotent - it checks before creating
- Safe to re-run

### Error: "Foreign key violation"
- Ensure `employees` table exists first
- Check that employee IDs in old `employees.role` column are valid

### Error: "Permission denied"
- Check database user has CREATE TABLE permissions
- Verify connection in `config/database.js`

## Next Steps

After migration:
1. ✅ Backend API routes already configured (`/api/rbac-v2/*`)
2. ✅ Auth middleware updated to support multiple roles
3. 🔄 Create frontend service for new endpoints
4. 🔄 Update RBAC component with multi-role UI
5. 🔄 Update sidebar to load menus dynamically

## Migration Status

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Ready |
| Seed Data | ✅ Ready |
| Backend API | ✅ Complete |
| Auth Middleware | ✅ Updated |
| Frontend Service | 🔄 Pending |
| RBAC UI | 🔄 Pending |
| Dynamic Sidebar | 🔄 Pending |

