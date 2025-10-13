# Menu Config Feature Implementation

## Overview
This feature provides a comprehensive **Menu Configuration** management page where administrators can dynamically create, update, delete, and organize menu items including parent-child relationships.

## Features Implemented

### 1. **Backend API** (`pawn-api/routes/menu-config.js`)
- **GET /api/menu-config/menu-items** - Get all menu items with hierarchy info
- **GET /api/menu-config/parent-menus** - Get only parent menus (for dropdown)
- **GET /api/menu-config/menu-items/:id** - Get single menu item
- **POST /api/menu-config/menu-items** - Create new menu item
- **PUT /api/menu-config/menu-items/:id** - Update menu item
- **DELETE /api/menu-config/menu-items/:id** - Delete menu item (prevents deletion if has children)
- **PUT /api/menu-config/menu-items/reorder** - Batch reorder menu items

### 2. **Frontend Component** (`pawn-web/src/app/features/management/menu-config/`)
- **menu-config.ts** - Component logic with CRUD operations
- **menu-config.html** - Full UI with modals for create/edit/delete
- **menu-config.service.ts** - Service for API calls
- **menu-config.css** - Styles

### 3. **Database Menu Item**
- Added "Menu Config" menu item to database
- Route: `/management/menu-config`
- Icon: ⚙️
- Root level menu (no parent)
- Order index: 9
- Active and accessible to administrators

## How to Use

### Access the Page
1. Refresh your browser to load the new menu item
2. Click on **"Menu Config"** in the sidebar (⚙️ icon)
3. You'll see a table of all menu items with their hierarchy

### Create a New Parent Menu
1. Click **"Create Menu"** button
2. Fill in:
   - **Name**: e.g., "Analytics"
   - **Route**: Use `#` for parent menus (they don't navigate)
   - **Icon**: Use an emoji like 📊, 📈, etc.
   - **Parent Menu**: Select "Root Level (No Parent)"
   - **Order Index**: Leave empty to auto-assign
   - **Description**: Optional description
   - **Active**: Check to make it visible
3. Click **"Create Menu"**

### Create a Child Menu
1. Click **"Create Menu"** button
2. Fill in:
   - **Name**: e.g., "Sales Report"
   - **Route**: The actual route like `/analytics/sales`
   - **Icon**: An emoji
   - **Parent Menu**: Select the parent (e.g., "Analytics")
   - **Order Index**: Leave empty or specify
   - **Active**: Check to make it visible
3. Click **"Create Menu"**

### Edit a Menu Item
1. Click the **✏️ (Edit)** button on any menu item
2. Modify any fields
3. You can change the parent to move it under a different parent
4. You cannot set a menu as its own parent (prevented)
5. Click **"Update Menu"**

### Delete a Menu Item
1. Click the **🗑️ (Delete)** button
2. Confirm the deletion
3. Note: You cannot delete a menu that has children - you must reassign or delete children first

### Filter Menu Items
- **Search**: Type to filter by name, route, or description
- **Status Filter**: Show only Active or Inactive menus
- **Parent Filter**: Show only Root level or children of specific parent
- **Reset**: Clear all filters

## Menu Structure Example

```
Dashboard (root)
Menu Config (root) ← NEW!
Management (root, parent)
├─ User Management (child)
├─ Pawner Management (child)
├─ Address Management (child)
├─ Item Management (child)
└─ Vouchers (child)
Transactions (root, parent)
├─ Appraisal (child)
├─ New Loan (child)
├─ Additional Loan (child)
├─ Partial Payment (child)
├─ Redeem (child)
├─ Renew (child)
└─ Auction Items (child)
Reports (root)
Settings (root)
RBAC (root)
```

## Creating Custom Menu Hierarchies

### Example: Create "Analytics" Parent with Children

**Step 1: Create Parent**
- Name: Analytics
- Route: #
- Icon: 📊
- Parent: Root Level
- Active: ✓

**Step 2: Create Children**
1. Sales Report
   - Route: /analytics/sales
   - Parent: Analytics
   - Order: 1

2. Inventory Report
   - Route: /analytics/inventory
   - Parent: Analytics
   - Order: 2

3. Custom Reports
   - Route: /analytics/custom
   - Parent: Analytics
   - Order: 3

## Database Schema

```sql
menu_items table:
- id: INTEGER PRIMARY KEY
- name: VARCHAR(255) - Display name
- route: VARCHAR(255) - Angular route or # for parents
- icon: VARCHAR(10) - Emoji icon
- parent_id: INTEGER - References menu_items(id), NULL for root
- order_index: INTEGER - Display order
- is_active: BOOLEAN - Show/hide menu
- description: TEXT - Optional description
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## API Examples

### Create a Parent Menu
```bash
POST /api/menu-config/menu-items
Content-Type: application/json

{
  "name": "Analytics",
  "route": "#",
  "icon": "📊",
  "parent_id": null,
  "order_index": 10,
  "description": "Analytics section",
  "is_active": true
}
```

### Create a Child Menu
```bash
POST /api/menu-config/menu-items
Content-Type: application/json

{
  "name": "Sales Report",
  "route": "/analytics/sales",
  "icon": "💰",
  "parent_id": 20,
  "order_index": 1,
  "description": "View sales reports",
  "is_active": true
}
```

### Update Parent Assignment
```bash
PUT /api/menu-config/menu-items/6
Content-Type: application/json

{
  "parent_id": 20
}
```
This moves menu item #6 to be a child of menu #20.

## UI Features

### Table View
- **Icon column**: Visual emoji representation
- **Name column**: Menu name + optional description
- **Route column**: Shows the navigation path
- **Parent column**: Badge showing parent name or "Root"
- **Order column**: Display order number
- **Children column**: Count of child items
- **Status column**: Active/Inactive badge
- **Actions column**: Edit and Delete buttons

### Modals
- **Create Modal**: Form to add new menu items
- **Edit Modal**: Form to modify existing items (autofocus on name field)
- **Delete Modal**: Confirmation with menu details preview

### Filters
- Real-time search across name, route, and description
- Filter by active/inactive status
- Filter by parent (root level or specific parent)
- Reset all filters button

### Pagination
- 10 items per page (configurable)
- Previous/Next navigation
- Shows current range (e.g., "Showing 1 to 10 of 18 results")

## Security

- Route protected with `data: { roles: ['administrator'] }`
- Only administrators can access Menu Config
- API endpoints should validate user permissions (add auth middleware)

## Testing

1. **Access**: Navigate to Menu Config from sidebar
2. **Create Parent**: Create a new parent menu with route "#"
3. **Create Children**: Create 2-3 child menus under the parent
4. **Verify Sidebar**: Refresh browser and verify new parent appears with expandable children
5. **Edit**: Change a child's parent assignment
6. **Delete**: Try deleting a parent (should fail), delete children first, then parent
7. **Filters**: Test search, status filter, and parent filter
8. **Pagination**: If >10 items, test pagination

## Files Modified/Created

### Backend
- ✅ `pawn-api/routes/menu-config.js` (NEW)
- ✅ `pawn-api/server.js` (added route registration)
- ✅ `pawn-api/add-menu-config.js` (setup script)

### Frontend
- ✅ `pawn-web/src/app/features/management/menu-config/menu-config.ts` (NEW)
- ✅ `pawn-web/src/app/features/management/menu-config/menu-config.html` (NEW)
- ✅ `pawn-web/src/app/features/management/menu-config/menu-config.css` (NEW)
- ✅ `pawn-web/src/app/features/management/menu-config/menu-config.service.ts` (NEW)
- ✅ `pawn-web/src/app/features/management/routes/management.routes.ts` (added route)

### Database
- ✅ Added "Menu Config" menu item (id: 20)
- ✅ Assigned permissions to administrator role

### Scripts Created
- ✅ `pawn-api/add-menu-config.js` - Adds Menu Config to database
- ✅ `pawn-api/check-menu-config.js` - Verifies Menu Config exists
- ✅ `pawn-api/assign-menu-config-permissions.js` - Assigns RBAC permissions

## Important: Permission Assignment

**Critical Step:** Menu Config won't appear in the sidebar unless permissions are assigned!

Run this command:
```bash
cd pawn-api
node assign-menu-config-permissions.js
```

This assigns view/create/edit/delete permissions to the administrator role. Without this, the RBAC system will filter out Menu Config even though it exists in the database.

## Troubleshooting

### "Menu Config" not appearing in sidebar
```bash
# Refresh browser (Ctrl+Shift+R)
# Or check database:
cd pawn-api
node -e "const {pool} = require('./config/database'); pool.query('SELECT * FROM menu_items WHERE name = \\'Menu Config\\'').then(r => {console.table(r.rows); pool.end();})"
```

### API errors
- Ensure API server is running: `cd pawn-api && npm run dev`
- Check API URL in `environment.ts` matches server port

### Cannot delete parent menu
- This is expected! Delete all children first, then delete the parent
- Or reassign children to a different parent

### New menus not showing in sidebar
- After creating menus via Menu Config, refresh the browser
- The sidebar loads menus from database on init

## Future Enhancements

1. **Drag & Drop Reordering**: Visual drag-drop to reorder menus
2. **Bulk Operations**: Select multiple menus to delete or move
3. **Icon Picker**: Visual emoji/icon picker instead of text input
4. **Route Validation**: Validate that routes actually exist in Angular
5. **Role Assignment**: Assign which roles can see each menu item
6. **Import/Export**: Export menu structure as JSON and import
7. **Preview**: Live preview of how menu will look before saving
8. **Undo/Redo**: History of menu changes with undo capability

## Notes

- Parent menus should use `#` as route (they don't navigate, just expand)
- Child menus should use actual Angular routes (e.g., `/management/user`)
- Order index determines display order within the same level
- Circular references are prevented (menu can't be its own parent)
- Children count is calculated dynamically
- All operations are transaction-safe (rollback on error)

---

**Status**: ✅ COMPLETE  
**Created**: October 13, 2025  
**Feature**: Dynamic menu configuration with parent-child assignment
