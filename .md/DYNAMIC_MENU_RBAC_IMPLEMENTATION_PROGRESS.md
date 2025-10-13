# Dynamic Menu & Multiple Roles RBAC System - Implementation Progress

## Overview
Complete redesign of the RBAC system to support:
- ✅ **Multiple roles per user** (with checkbox selection)
- ✅ **Dynamic menu management** (database-driven sidebars)
- ✅ **Granular permissions** (view, create, edit, delete per menu)
- ✅ **Role-based menu visibility** (checkbox matrix UI)

---

## ✅ COMPLETED TASKS

### 1. Database Migration ✓
**File:** `pawn-api/migrations/create-dynamic-menu-rbac-system.js`

**New Tables Created:**
```sql
menu_items:
- id, name, route, icon, parent_id, order_index, is_active, description

roles:
- id, name, display_name, description, is_system_role

role_menu_permissions:
- id, role_id, menu_item_id, can_view, can_create, can_edit, can_delete

employee_roles:
- id, employee_id, role_id, is_primary, assigned_by, assigned_at
```

**Migration Results:**
- ✅ 4 new tables created with proper foreign keys
- ✅ 7 default roles inserted (admin, administrator, manager, cashier, auctioneer, appraiser, pawner)
- ✅ 18 menu items inserted (all current sidebar items)
- ✅ Default permissions configured for each role
- ✅ Existing employee roles migrated to new system
- ✅ Indexes created for performance

**Note:** Old `employees.role` column kept for backward compatibility

---

### 2. Backend API Endpoints ✓
**File:** `pawn-api/routes/rbac-v2.js`

**Menu Management:**
- `GET /api/rbac-v2/menus` - Get all menu items
- `GET /api/rbac-v2/menus/user/:userId` - Get menus for specific user (based on roles)
- `POST /api/rbac-v2/menus` - Create new menu item
- `PUT /api/rbac-v2/menus/:id` - Update menu item
- `DELETE /api/rbac-v2/menus/:id` - Delete menu item

**Role Management:**
- `GET /api/rbac-v2/roles` - Get all roles with user counts
- `POST /api/rbac-v2/roles` - Create custom role
- `PUT /api/rbac-v2/roles/:id` - Update role (non-system only)
- `DELETE /api/rbac-v2/roles/:id` - Delete role (non-system only)

**Permission Management:**
- `GET /api/rbac-v2/permissions/role/:roleId` - Get all menu permissions for a role
- `GET /api/rbac-v2/permissions/matrix` - Get full permission matrix (all roles × menus)
- `PUT /api/rbac-v2/permissions` - Update role-menu permissions
- `DELETE /api/rbac-v2/permissions` - Remove permission

**User-Role Assignments:**
- `GET /api/rbac-v2/users` - Get all users with their roles (array)
- `POST /api/rbac-v2/users/:userId/roles` - Assign multiple roles to user (with checkboxes)
- `DELETE /api/rbac-v2/users/:userId/roles/:roleId` - Remove specific role from user
- `PUT /api/rbac-v2/users/:userId/primary-role` - Set primary role for user

**Authorization:** All endpoints require admin/administrator/manager roles

---

### 3. Updated Auth Middleware ✓
**File:** `pawn-api/middleware/auth.js`

**Changes:**
- `authenticateToken()` now fetches ALL user roles from `employee_roles` table
- Returns `req.user.roles` as an array: `['admin', 'manager']`
- Returns `req.user.role` as primary role (for backward compatibility)
- `authorizeRoles()` now checks if user has ANY of the required roles
- Supports both single role (legacy) and multiple roles (new system)

**User Object Structure:**
```javascript
req.user = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',              // Primary role (backward compatible)
  roles: ['admin', 'manager'], // All assigned roles (NEW)
  legacy_role: 'admin',        // Original role column
  primary_role: 'admin',       // From employee_roles.is_primary
  branch_id: 1,
  is_active: true
}
```

**Logging:** Enhanced logs show both primary and all roles for debugging

---

## 🚧 PENDING TASKS

### 4. Frontend RBAC Service (In Progress)
**File:** `pawn-web/src/app/core/services/rbac-v2.service.ts` (TO CREATE)

**Required Methods:**
```typescript
// Menu Management
getMenus(): Promise<MenuItem[]>
getMenusByUser(userId: number): Promise<MenuItem[]>
createMenu(menu: MenuItem): Promise<Response>
updateMenu(id: number, menu: MenuItem): Promise<Response>
deleteMenu(id: number): Promise<Response>

// Role Management
getRoles(): Promise<Role[]>
createRole(role: Role): Promise<Response>
updateRole(id: number, role: Role): Promise<Response>
deleteRole(id: number): Promise<Response>

// Permission Management
getRolePermissions(roleId: number): Promise<Permission[]>
getPermissionMatrix(): Promise<MatrixData[]>
updatePermission(permission: Permission): Promise<Response>
removePermission(roleId: number, menuId: number): Promise<Response>

// User-Role Management
getUsersWithRoles(): Promise<UserWithRoles[]>
assignRolesToUser(userId: number, roleIds: number[], primaryRoleId: number): Promise<Response>
removeRoleFromUser(userId: number, roleId: number): Promise<Response>
setPrimaryRole(userId: number, roleId: number): Promise<Response>
```

---

### 5. RBAC Component Update (Pending)
**File:** `pawn-web/src/app/features/rbac/rbac.component.ts` (TO UPDATE)

**New 4-Tab Interface:**

**Tab 1: Users Management**
- Table showing all users
- "Roles" column with multiple badges
- "Edit Roles" button opens modal with:
  - Checkboxes for all available roles
  - Radio button to select primary role
  - Save button to update

**Tab 2: Roles Management**
- List of all roles (system + custom)
- Add new role button
- Edit/Delete buttons (disabled for system roles)
- User count per role

**Tab 3: Menu Management**
- List of all menu items
- Add new menu button
- Edit (name, route, icon, order) button
- Delete button
- Drag-and-drop to reorder

**Tab 4: Permissions Matrix**
- Grid layout: Roles (columns) × Menus (rows)
- Checkboxes for each role-menu combination
- "View" checkbox (others: Create, Edit, Delete optional)
- Save changes button

---

### 6. Dynamic Sidebar (Pending)
**File:** `pawn-web/src/app/shared/sidebar/sidebar.ts` (TO UPDATE)

**Changes Needed:**
1. Remove hardcoded `navigationItems` array
2. Add `menuItems$: Observable<MenuItem[]>`
3. In `ngOnInit()`:
   ```typescript
   this.menuItems$ = this.rbacService.getMenusByUser(this.currentUser.id);
   ```
4. Update template to use `*ngFor="let item of menuItems$ | async"`
5. Icons can be:
   - Emoji (📊, 💳, etc.)
   - Material Icons ('dashboard', 'list', etc.)
   - Or keep current approach

---

## Testing Checklist

### Backend Testing
- [ ] Run migration: `node migrations/create-dynamic-menu-rbac-system.js`
- [ ] Verify tables created: `SELECT * FROM menu_items, roles, role_menu_permissions, employee_roles`
- [ ] Test GET `/api/rbac-v2/roles` - Should return 7 roles
- [ ] Test GET `/api/rbac-v2/menus` - Should return 18 menu items
- [ ] Test GET `/api/rbac-v2/users` - Should show users with roles array
- [ ] Test GET `/api/rbac-v2/permissions/matrix` - Should return grid data
- [ ] Test POST `/api/rbac-v2/users/:userId/roles` with `role_ids: [1, 2]`
- [ ] Verify auth middleware logs show multiple roles

### Frontend Testing (After Implementation)
- [ ] Login as admin
- [ ] Navigate to RBAC page
- [ ] Tab 1: Select user, check multiple roles, set primary, save
- [ ] Tab 2: Create custom role, edit, delete
- [ ] Tab 3: Add menu item, edit, reorder, delete
- [ ] Tab 4: Check/uncheck role-menu permissions, save
- [ ] Logout and login as user with multiple roles
- [ ] Verify sidebar shows combined menus from all roles
- [ ] Test access to pages based on permissions

---

## Database Schema Diagram

```
employees (1) → (N) employee_roles (N) → (1) roles
roles (1) → (N) role_menu_permissions (N) → (1) menu_items

User can have multiple roles (via employee_roles)
Each role can access multiple menus (via role_menu_permissions)
Menus are dynamically loaded based on user's combined roles
```

---

## API Usage Examples

### 1. Assign Multiple Roles to User
```javascript
POST /api/rbac-v2/users/5/roles
{
  "role_ids": [1, 2, 3],  // admin, manager, cashier
  "primary_role_id": 2,    // manager is primary
  "replace": true          // Remove old roles first
}
```

### 2. Update Role-Menu Permission
```javascript
PUT /api/rbac-v2/permissions
{
  "role_id": 3,
  "menu_id": 5,
  "can_view": true,
  "can_create": true,
  "can_edit": false,
  "can_delete": false
}
```

### 3. Get User's Menus
```javascript
GET /api/rbac-v2/menus/user/5
// Returns only menus user can access based on all their roles
```

---

## Migration Status

| Component | Status | File |
|-----------|--------|------|
| Database Tables | ✅ Complete | `migrations/create-dynamic-menu-rbac-system.js` |
| Seed Data | ✅ Complete | Included in migration |
| Backend API | ✅ Complete | `routes/rbac-v2.js` |
| Auth Middleware | ✅ Complete | `middleware/auth.js` |
| Frontend Service | 🔄 Pending | `services/rbac-v2.service.ts` |
| RBAC Component | 🔄 Pending | `features/rbac/rbac.component.ts` |
| Sidebar Update | 🔄 Pending | `shared/sidebar/sidebar.ts` |

---

## Next Steps

1. **Create Frontend Service** (`rbac-v2.service.ts`)
   - Implement all API methods
   - Add proper TypeScript interfaces
   - Handle errors gracefully

2. **Update RBAC Component** (4 tabs)
   - Users tab: Checkbox multi-select for roles
   - Roles tab: CRUD operations
   - Menus tab: CRUD + reorder
   - Permissions tab: Checkbox matrix

3. **Update Sidebar**
   - Fetch menus from API
   - Render dynamically
   - Cache for performance

4. **Testing**
   - Test all combinations
   - Verify permissions work correctly
   - Check sidebar updates in real-time

---

## Notes

- Old `employees.role` column kept for backward compatibility
- System roles cannot be edited or deleted
- Primary role is used for dashboard routing and display
- All roles combined determine menu visibility
- Permissions are additive (if any role grants access, user can access)

