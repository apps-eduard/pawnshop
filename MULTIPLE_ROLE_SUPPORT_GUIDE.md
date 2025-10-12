# Multiple Role Support - Implementation Guide

## Overview
This system now supports users with multiple roles. A user can have roles like Manager, Auctioneer, and Cashier simultaneously, and can switch between them without logging out.

## How It Works

### 1. User Data Structure

**Updated User Interface:**
```typescript
interface User {
  id: number;
  username: string;
  role: string;          // Current/active role
  roles?: string[];      // All available roles (optional)
  // ... other fields
}
```

**Example User with Multiple Roles:**
```json
{
  "id": 5,
  "username": "john.manager",
  "firstName": "John",
  "lastName": "Doe",
  "role": "manager",           // Currently active role
  "roles": ["manager", "auctioneer", "cashier"],  // All available roles
  "branchId": "1"
}
```

### 2. Backend Changes Required

**Update Login Response** (`pawn-api/routes/auth.js`):

```javascript
// When user logs in, return both role and roles array
router.post('/login', async (req, res) => {
  // ... authentication logic
  
  const user = {
    id: employee.id,
    username: employee.username,
    firstName: employee.first_name,
    lastName: employee.last_name,
    role: employee.role,  // Primary role
    roles: [employee.role],  // For now, single role. Update if you have multi-role table
    branchId: employee.branch_id,
    // ...
  };
  
  res.json({
    success: true,
    data: {
      user,
      token,
      refreshToken
    }
  });
});
```

**For Multi-Role Support (Future):**

If you want to store multiple roles per user in the database:

```sql
-- Option 1: JSON array in employees table
ALTER TABLE employees ADD COLUMN roles JSONB DEFAULT '[]'::JSONB;

-- Option 2: Separate employee_roles junction table
CREATE TABLE employee_roles (
  employee_id INTEGER REFERENCES employees(id),
  role VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (employee_id, role)
);
```

### 3. Frontend Implementation

**AuthService Methods** (`pawn-web/src/app/core/auth/auth.ts`):

```typescript
// Check if user has multiple roles
hasMultipleRoles(): boolean {
  const user = this.getCurrentUser();
  return !!user?.roles && user.roles.length > 1;
}

// Get all available roles for current user
getAvailableRoles(): string[] {
  const user = this.getCurrentUser();
  return user?.roles || (user?.role ? [user.role] : []);
}

// Switch to a different role
switchRole(newRole: string): void {
  const user = this.getCurrentUser();
  if (!user) return;
  
  // Validate user has access to this role
  const availableRoles = this.getAvailableRoles();
  if (!availableRoles.includes(newRole)) {
    console.warn(`User does not have access to role: ${newRole}`);
    return;
  }
  
  // Update current role
  user.role = newRole;
  localStorage.setItem('currentUser', JSON.stringify(user));
  this.currentUserSubject.next(user);
  
  console.log(`✅ Switched to role: ${newRole}`);
}
```

### 4. Role Switcher UI

**Location:** User dropdown menu in navbar (top-right corner)

**Features:**
- Only appears if user has multiple roles (`hasMultipleRoles()` returns true)
- Shows all available roles with icons
- Current role is highlighted
- Clicking a role switches to that role and navigates to its dashboard

**User Experience:**
1. User clicks profile picture/avatar
2. Dropdown shows current role
3. If multiple roles exist, "Switch Role" section appears
4. User clicks desired role
5. System switches role and navigates to new dashboard
6. Sidebar updates to show role-specific menu items

### 5. Dashboard Navigation

**Automatic Routing:**
```typescript
getDashboardRoute(): string {
  const user = this.getCurrentUser();
  switch (user.role) {
    case 'administrator': return '/dashboard/admin';
    case 'manager': return '/dashboard/manager';
    case 'cashier': return '/dashboard/cashier';
    case 'auctioneer': return '/dashboard/auctioneer';
    case 'appraiser': return '/dashboard/appraiser';
    default: return '/login';
  }
}
```

When a user switches roles:
1. `switchRole()` updates the active role
2. `getDashboardRoute()` calculates new dashboard path
3. Router navigates to new dashboard
4. Sidebar automatically updates to show role-specific items

## Usage Examples

### Example 1: Single Role User (Current System)
```json
{
  "username": "cashier01",
  "role": "cashier",
  "roles": ["cashier"]  // Optional, will default to [role]
}
```
**Result:** No role switcher appears, works exactly as before

### Example 2: Multi-Role User
```json
{
  "username": "john.manager",
  "role": "manager",  // Currently active
  "roles": ["manager", "auctioneer", "cashier"]
}
```
**Result:** 
- Role switcher appears in user menu
- Can switch between Manager, Auctioneer, and Cashier dashboards
- Each role shows appropriate menu items and features

### Example 3: Switching Roles
```typescript
// User is currently a Manager
currentRole = "manager";
availableRoles = ["manager", "auctioneer", "cashier"];

// User clicks "Auctioneer" in role switcher
switchRole("auctioneer");

// System updates:
// - currentRole = "auctioneer"
// - Navigates to /dashboard/auctioneer
// - Sidebar shows auctioneer menu items
// - User can now access expired items, set auction prices, etc.
```

## Testing

### 1. Test Single Role User (No changes)
- Login as cashier-only user
- Verify no role switcher appears
- Verify normal cashier dashboard loads

### 2. Test Multi-Role User (New feature)

**Step 1: Temporarily Mock Multi-Role User**
In browser console after login:
```javascript
let user = JSON.parse(localStorage.getItem('currentUser'));
user.roles = ['manager', 'auctioneer', 'cashier'];
localStorage.setItem('currentUser', JSON.stringify(user));
location.reload();
```

**Step 2: Test Role Switching**
1. Click avatar → See "Switch Role" section
2. Click "Auctioneer" → Navigate to auctioneer dashboard
3. Check sidebar → See auctioneer menu items
4. Click avatar again → See "Manager" and "Cashier" options
5. Click "Cashier" → Navigate to cashier dashboard
6. Verify all dashboards work correctly

### 3. Test Permissions
- Verify each role can only access their authorized features
- Test that switching roles updates available menu items
- Confirm API calls use correct authentication

## Future Enhancements

### 1. Database Multi-Role Storage
Create `employee_roles` table to store multiple roles per employee

### 2. Role Permissions Matrix
Define specific permissions for each role beyond just dashboard access

### 3. Role History
Track when users switch roles for audit purposes

### 4. Role-Specific Settings
Allow users to save preferences per role

### 5. Quick Role Switch Hotkey
Add keyboard shortcut for rapid role switching

## Security Considerations

1. **Backend Validation:** Always validate role permissions on the backend
2. **Token Claims:** Consider including all available roles in JWT token
3. **Role Verification:** API should verify user has access to requested role
4. **Audit Logging:** Log all role switches for security auditing

## FAQ

**Q: What if a user's `roles` array is empty or undefined?**
A: System falls back to single `role` field, maintaining backwards compatibility

**Q: Can a user have a role they're not currently using?**
A: Yes, `roles` array contains all available roles, `role` is the active one

**Q: Does switching roles require re-authentication?**
A: No, it's instant. The JWT token and session remain valid.

**Q: What happens to in-progress work when switching roles?**
A: User navigates to new dashboard. Unsaved work should be saved first.

**Q: Can an admin grant new roles to users on-the-fly?**
A: Not yet implemented. Requires user management UI update.

---

**Implementation Status:** ✅ Frontend Complete, ⏳ Backend Update Required
**Date:** October 12, 2025
