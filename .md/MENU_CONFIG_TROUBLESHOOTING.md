# Menu Config - Troubleshooting Guide

## Issue: Menu Config Not Appearing in Sidebar

If you don't see "Menu Config" (⚙️) in your sidebar after implementation, follow these steps:

### Step 1: Verify Menu Config Exists in Database

```bash
cd pawn-api
node check-menu-config.js
```

**Expected Output:**
- Menu Config with ID 20
- Route: `/management/menu-config`
- Icon: ⚙️
- is_active: true
- parent_id: null (root level)

### Step 2: Assign Permissions to Administrator Role

**The Problem:**
The sidebar loads menus through the RBAC v2 system, which filters menus based on the `role_menu_permissions` table. Even though Menu Config exists and is active, it won't appear unless permissions are assigned.

**The Solution:**
Run the permission assignment script:

```bash
cd pawn-api
node assign-menu-config-permissions.js
```

**What It Does:**
- Finds Menu Config menu item (id: 20)
- Finds Administrator role (id: 1)
- Creates entry in `role_menu_permissions` table with:
  - can_view: true
  - can_create: true
  - can_edit: true
  - can_delete: true

### Step 3: Refresh Browser

After assigning permissions:
1. Open your browser
2. Press `Ctrl + Shift + R` (hard refresh)
3. Menu Config should now appear at the bottom of the sidebar

### Step 4: Verify It's Working

1. Click on "Menu Config" (⚙️)
2. You should see a table with all menu items
3. Try creating a new menu item
4. Try editing an existing menu item

## Why This Happens

The system uses a role-based access control (RBAC) system where:

1. **Menu Items** are stored in `menu_items` table
2. **Roles** are stored in `roles` table
3. **Permissions** are stored in `role_menu_permissions` table
4. **User-Role Assignments** are stored in `employee_roles` table

When the sidebar loads, it calls:
```
GET /api/rbac-v2/menus/user/{userId}
```

This endpoint queries:
```sql
SELECT DISTINCT m.*
FROM menu_items m
INNER JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id
INNER JOIN employee_roles er ON rmp.role_id = er.role_id
WHERE er.employee_id = $1
  AND m.is_active = true
  AND rmp.can_view = true
```

If `role_menu_permissions` doesn't have an entry for Menu Config, it won't be returned even if it's active!

## Manual Database Fix

If the script doesn't work, you can manually add the permission:

```sql
-- Find Menu Config ID
SELECT id FROM menu_items WHERE name = 'Menu Config';
-- Result: 20

-- Find Administrator Role ID  
SELECT id FROM roles WHERE name = 'administrator';
-- Result: 1

-- Insert Permission
INSERT INTO role_menu_permissions 
(role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
VALUES (1, 20, true, true, true, true);
```

## Assign to Other Roles

If you want managers or other roles to access Menu Config:

```sql
-- Find the role ID
SELECT id, name FROM roles;

-- Assign permission (replace {role_id} with actual ID)
INSERT INTO role_menu_permissions 
(role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
VALUES ({role_id}, 20, true, true, true, true);
```

Example for Manager role:
```sql
INSERT INTO role_menu_permissions 
(role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
VALUES (2, 20, true, false, false, false);
-- Manager can VIEW but not CREATE/EDIT/DELETE
```

## Future Menu Items

**Important:** Whenever you create a new menu item (either through Menu Config page or SQL), remember to:

1. Create the menu item
2. Assign permissions to roles that should see it
3. Users refresh their browser

Otherwise, the menu won't appear for anyone!

## Quick Test

To test if a specific user can see Menu Config:

```sql
SELECT 
  m.name, 
  r.name as role_name,
  rmp.can_view
FROM menu_items m
JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id
JOIN employee_roles er ON rmp.role_id = er.role_id
WHERE er.employee_id = {your_user_id}
  AND m.name = 'Menu Config';
```

If this returns no rows, the user can't see Menu Config.

## Still Not Working?

1. **Clear browser cache completely**
2. **Check browser console for errors** (F12)
3. **Verify API is running** (http://localhost:3000/health)
4. **Verify Angular is running** (http://localhost:4200)
5. **Check you're logged in as Administrator**
6. **Check network tab** to see if `/menus/user/{id}` is being called
7. **Look at the API response** - does it include Menu Config?

## Success Checklist

- [ ] Menu Config exists in database (id: 20)
- [ ] Menu Config is active (is_active = true)
- [ ] Menu Config has route `/management/menu-config`
- [ ] Role permission exists in `role_menu_permissions`
- [ ] Permission has `can_view = true`
- [ ] Your user has administrator role
- [ ] Browser has been refreshed (hard refresh)
- [ ] API server is running
- [ ] Angular server is running
- [ ] You're logged in

If all checked, Menu Config should appear! ✅

---

**Quick Fix Script:**
```bash
cd pawn-api
node assign-menu-config-permissions.js
# Then refresh browser
```
