# Menu Items Seeding Guide

## Overview
The menu system is now properly seeded through Knex migrations, so when you delete the database and run `setup.ps1`, all menu items will be automatically recreated.

## What Gets Seeded

### Parent Menus (Expandable Categories)
1. **📁 Management** (ID: 18)
   - Contains all management-related pages
   - 6 children menus

2. **💰 Transactions** (ID: 19)
   - Contains all transaction-related pages
   - 7 children menus

### Management Children (parent_id = 18)
1. **👥 User** (ID: 3) → `/user-management`
2. **🧑‍🤝‍🧑 Pawner** (ID: 4) → `/pawner-management`
3. **🏠 Address** (ID: 17) → `/address-management`
4. **📦 Item** (ID: 5) → `/item-management`
5. **🎟️ Vouchers** (ID: 16) → `/voucher-management`
6. **⚙️ Menu Config** (ID: 20) → `/menu-config`

### Transactions Children (parent_id = 19)
1. **💎 Appraisal** (ID: 6) → `/appraisal`
2. **➕ New Loan** (ID: 7) → `/new-loan`
3. **💵 Additional** (ID: 8) → `/additional-loan`
4. **💳 Partial Payment** (ID: 9) → `/partial-payment`
5. **🎁 Redeem** (ID: 10) → `/redeem`
6. **🔄 Renew** (ID: 11) → `/renew`
7. **🔨 Auction** (ID: 12) → `/auction`

### Standalone Menus (no parent)
1. **📈 Reports** (ID: 13) → `/reports`

## RBAC Permissions

All menus are automatically assigned to the **Administrator** role with full permissions:
- **Parent menus**: View only (can_view = true, others = false)
- **Child menus**: Full access (can_view, can_create, can_edit, can_delete = true)
- **Standalone menus**: Full access

## How to Use

### When You Delete the Database

Simply run the setup script:
```powershell
.\setup.ps1
```

This will:
1. Rollback all migrations
2. Run migrations (create tables)
3. Run all seed files **including the new menu items seed**
4. Reset passwords
5. Verify setup

### Manual Menu Seeding (If Needed)

If you only need to reseed menu items:
```bash
cd pawn-api
npx knex seed:run --specific=08_menu_items_seeds.js
```

### What the Seed Does

1. **Clears existing data**:
   - Deletes all role_menu_permissions
   - Deletes all menu_items

2. **Creates parent menus** (Management, Transactions)

3. **Creates child menus** with proper parent_id references

4. **Creates standalone menus** (Reports)

5. **Assigns permissions** to administrator role for all menus

## Menu Structure

```
📁 Management (parent - expandable)
   ├─ 👥 User Management
   ├─ 🧑‍🤝‍🧑 Pawner Management
   ├─ 🏠 Address Management
   ├─ 📦 Item Management
   ├─ 🎟️ Voucher Management
   └─ ⚙️ Menu Config (CRUD for menus)

💰 Transactions (parent - expandable)
   ├─ 💎 Appraisal
   ├─ ➕ New Loan
   ├─ 💵 Additional Loan
   ├─ 💳 Partial Payment
   ├─ 🎁 Redeem
   ├─ 🔄 Renew
   └─ 🔨 Auction

📈 Reports (standalone)
```

## Customizing Menus

You can customize menus through the **Menu Config** page in the application:
1. Login as admin
2. Go to Management → Menu Config
3. Create, edit, or delete menu items
4. Assign parent-child relationships
5. Choose icons from the icon picker (30+ emojis available)

## Icon Picker

The Menu Config page includes an icon picker with 30 predefined emojis:
- Chart/Dashboard 📊
- Folder/Management 📁
- Money/Transactions 💰
- Users/People 👥
- And 26 more...

Users no longer need to manually type emojis - just click "Choose Icon" and select from the grid!

## Troubleshooting

### Menus Not Appearing in Sidebar

**Check permissions:**
```sql
SELECT m.name, rmp.* 
FROM menu_items m 
LEFT JOIN role_menu_permissions rmp ON m.id = rmp.menu_item_id 
WHERE rmp.role_id = 1;
```

**Check menu structure:**
```sql
SELECT 
  m.id, 
  m.name, 
  m.route, 
  m.parent_id, 
  p.name as parent_name, 
  m.is_active 
FROM menu_items m 
LEFT JOIN menu_items p ON m.parent_id = p.id 
ORDER BY m.order_index;
```

### Cascading Not Working

Ensure parent menus have:
- `parent_id = NULL`
- `route = NULL` (parent menus don't have routes)
- At least one child menu with `parent_id = parent.id`

### Menu Config Not Accessible

Check that Menu Config has permission:
```sql
SELECT * FROM role_menu_permissions 
WHERE menu_item_id = 20 AND role_id = 1;
```

## Files Modified

- **pawn-api/seeds/08_menu_items_seeds.js** - New seed file for menu items
- **setup.ps1** - Updated to mention menu seeding in console output
- **pawn-web/src/app/features/management/menu-config/** - Menu Config feature with icon picker

## Benefits

✅ **No manual database scripts needed** - Everything runs automatically with `setup.ps1`  
✅ **Consistent menu structure** - Same menus every time you reset  
✅ **Proper cascading hierarchy** - Parent-child relationships preserved  
✅ **RBAC ready** - Permissions automatically assigned  
✅ **User-friendly icon selection** - No need to manually type emojis  

## Next Steps

After running setup.ps1:
1. Start the backend: `cd pawn-api; npm start`
2. Start the frontend: `cd pawn-web; ng serve`
3. Login as admin (username: admin, password: password123)
4. All menus will be visible in the sidebar with proper cascading
5. You can customize menus through Menu Config page
