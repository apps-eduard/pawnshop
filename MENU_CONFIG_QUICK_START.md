# Menu Config - Quick Reference

## What Changed?

Instead of having "Management" as a sidebar menu item, you now have **"Menu Config"** which is a dedicated page where you can:

- ✅ Create new parent menus (like Management, Transactions, etc.)
- ✅ Create child menus under any parent
- ✅ Edit existing menus (change name, route, icon, parent, order)
- ✅ Delete menus (children first, then parents)
- ✅ Filter and search all menu items
- ✅ See hierarchy and children count
- ✅ Dynamically manage the entire sidebar structure

## Quick Start

### 1. Access Menu Config
- Refresh your browser (`Ctrl + Shift + R`)
- Look for **"Menu Config"** menu item (⚙️ icon) at the bottom of sidebar
- Click it to open the configuration page

### 2. Current Menu Structure

```
Dashboard
Management (parent with 5 children)
├─ User Management
├─ Pawner Management  
├─ Address Management
├─ Item Management
└─ Vouchers
Transactions (parent with 7 children)
├─ Appraisal
├─ New Loan
├─ Additional Loan
├─ Partial Payment
├─ Redeem
├─ Renew
└─ Auction Items
Reports
Settings
RBAC
Menu Config ← NEW!
```

### 3. Example: Create "Analytics" Parent Menu

**Step 1: Create Parent**
1. Click **"Create Menu"** button
2. Fill in:
   - Name: `Analytics`
   - Route: `#` (important: use # for parent menus)
   - Icon: `📊` (or any emoji you like)
   - Parent Menu: `Root Level (No Parent)`
   - Description: `Analytics and reports section`
   - Active: ✓ (checked)
3. Click **"Create Menu"**

**Step 2: Create First Child (Sales Report)**
1. Click **"Create Menu"** button again
2. Fill in:
   - Name: `Sales Report`
   - Route: `/analytics/sales`
   - Icon: `💰`
   - Parent Menu: `📊 Analytics` (select from dropdown)
   - Order Index: `1` (or leave empty)
   - Active: ✓
3. Click **"Create Menu"**

**Step 3: Create Second Child (Inventory Report)**
1. Click **"Create Menu"** button
2. Fill in:
   - Name: `Inventory Report`
   - Route: `/analytics/inventory`
   - Icon: `📦`
   - Parent Menu: `📊 Analytics`
   - Order Index: `2`
   - Active: ✓
3. Click **"Create Menu"**

**Step 4: Verify**
1. Refresh browser (`Ctrl + Shift + R`)
2. Look for "Analytics" in sidebar
3. Click it to expand
4. Should show "Sales Report" and "Inventory Report" as children

## Common Tasks

### Move a Menu to Different Parent
1. Find the menu in the table
2. Click **✏️ (Edit)** button
3. Change **"Parent Menu"** dropdown to new parent
4. Click **"Update Menu"**
5. Refresh browser to see changes

### Reorder Menus
1. Find the menu in the table
2. Click **✏️ (Edit)** button
3. Change **"Order Index"** to desired number (lower numbers appear first)
4. Click **"Update Menu"**
5. Refresh browser to see changes

### Hide a Menu (Make Inactive)
1. Find the menu in the table
2. Click **✏️ (Edit)** button
3. Uncheck **"Active"** checkbox
4. Click **"Update Menu"**
5. Refresh browser - menu will disappear from sidebar

### Delete a Menu with Children
1. First, delete or reassign all children:
   - Click **✏️ (Edit)** on each child
   - Change **"Parent Menu"** to different parent or "Root Level"
   - Or click **🗑️ (Delete)** on each child
2. Then delete the parent:
   - Click **🗑️ (Delete)** on parent
   - Confirm deletion

### Search for a Menu
1. Use the **"Search"** box at top
2. Type menu name, route, or description
3. Table filters in real-time

### Filter by Parent
1. Use **"Parent Menu"** dropdown at top
2. Select a parent to see only its children
3. Or select **"Root Level Only"** to see only parent menus

## Important Notes

### Parent Menus vs Child Menus
- **Parent menus**: Use `#` as route (they don't navigate, just expand)
- **Child menus**: Use actual routes like `/management/user`

### Order Index
- Lower numbers appear first (1, 2, 3...)
- Within same parent, children are sorted by order_index
- Root menus are also sorted by order_index

### Route Format
- Must start with `/` (e.g., `/dashboard`)
- Can have multiple segments (e.g., `/management/user`)
- Use `#` only for parent menus that shouldn't navigate

### Icons
- Use emojis: 📊, 💰, 📦, 👥, 🏠, etc.
- Keep it to 1-2 characters
- Should be meaningful and recognizable

### After Making Changes
- **Always refresh browser** to see changes in sidebar
- Menu structure is loaded from database on page load
- Changes in Menu Config don't reflect immediately in sidebar

## Troubleshooting

### "Menu Config" not showing in sidebar
```bash
# 1. Check database
cd pawn-api
node -e "const {pool} = require('./config/database'); pool.query('SELECT * FROM menu_items WHERE name = \\'Menu Config\\'').then(r => {console.table(r.rows); pool.end();})"

# 2. If not found, run setup script
node add-menu-config.js
```

### Created menu not appearing in sidebar
- Did you refresh the browser? (Ctrl + Shift + R)
- Is the menu set to **Active**?
- Does the parent menu (if any) exist and is it active?
- Check the route format (should start with `/`)

### Cannot delete a parent menu
- This is expected behavior!
- You cannot delete a menu that has children
- Solution: Delete all children first, or reassign them to a different parent

### Changes not reflecting
- **Always refresh browser** after making changes
- Clear browser cache if needed
- Check if menu is set to Active

## Benefits of Menu Config

### Before (Old Way)
- Had to manually edit database SQL
- No validation
- Hard to see hierarchy
- Easy to make mistakes
- Required database knowledge

### Now (With Menu Config)
- ✅ Visual interface
- ✅ Form validation
- ✅ See hierarchy in table
- ✅ Prevents errors (circular refs, deleting parents with children)
- ✅ Search and filter
- ✅ No SQL knowledge needed
- ✅ Safe and transaction-protected

## Next Steps

1. ✅ **Access Menu Config** - Refresh browser and click Menu Config menu
2. ✅ **Explore Current Structure** - See how Management and Transactions are set up
3. ✅ **Try Creating** - Create a test parent menu with a child
4. ✅ **Test Editing** - Edit a menu's icon or description
5. ✅ **Test Deleting** - Delete the test menu you created
6. ✅ **Verify Sidebar** - Refresh and check sidebar reflects your changes

---

**Need Help?**
- Check `MENU_CONFIG_IMPLEMENTATION.md` for detailed documentation
- All operations are logged in browser console
- API errors are shown in the page alerts
