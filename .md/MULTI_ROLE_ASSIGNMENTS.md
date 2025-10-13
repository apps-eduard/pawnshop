# Multi-Role Assignments Configuration

## Overview
This document describes how multiple roles are assigned to users based on their primary role in the system.

## Implementation Details

### Backend: Login Endpoint
**File:** `pawn-api/routes/auth.js`

The login endpoint now automatically assigns multiple roles based on the user's primary role:

```javascript
// Determine available roles based on user's role
let availableRoles = [user.role]; // Default: single role

// Only Manager and Auctioneer have access to multiple roles
// Administrator stays as single role for security
if (user.role === 'manager') {
  availableRoles = ['manager', 'auctioneer', 'cashier'];
} else if (user.role === 'auctioneer') {
  availableRoles = ['auctioneer', 'appraiser', 'cashier'];
}
```

### Role Assignment Matrix

| Primary Role | Available Roles |
|-------------|----------------|
| **Administrator** | Administrator (single role) |
| **Manager** | Manager, Auctioneer, Cashier |
| **Auctioneer** | Auctioneer, Appraiser, Cashier |
| **Cashier** | Cashier (single role) |
| **Appraiser** | Appraiser (single role) |

## Frontend: Role Switcher UI

### Location
The role switcher appears in the navbar (top right), replacing the bell notification icon.

### Visibility Rules
- **Shows** when: `user.roles.length > 1`
- **Hidden** when: User has only 1 role

### UI Features
1. **Badge Counter**: Shows total number of available roles
2. **Dropdown Menu**: Lists all available roles with icons
3. **Current Role Indicator**: Checkmark on active role
4. **One-Click Switching**: Click any role to switch dashboards

### Role Icons
Each role has a unique SVG icon:
- 👥 **Administrator**: Users/group icon
- 📊 **Manager**: Bar chart icon
- 🔨 **Auctioneer**: Shopping cart/gavel icon
- 💰 **Cashier**: Cash register icon
- 📋 **Appraiser**: Clipboard with checkmark icon

## User Experience Flow

### Login Process
```
1. User logs in with credentials
   ↓
2. Backend checks primary role
   ↓
3. Backend assigns multiple roles if applicable
   ↓
4. Frontend receives user object with roles array
   ↓
5. Role switcher icon appears in navbar (if multiple roles)
   ↓
6. User sees badge with role count (e.g., "3")
```

### Role Switching Process
```
1. User clicks role switcher icon in navbar
   ↓
2. Dropdown shows all available roles
   ↓
3. User clicks desired role
   ↓
4. AuthService updates active role in localStorage
   ↓
5. Router navigates to new role's dashboard
   ↓
6. Sidebar updates to show role-specific menu items
   ↓
7. Page title updates
   ↓
8. Dropdown closes automatically
```

## Testing Instructions

### Test Multi-Role Functionality

**Step 1: Login as Administrator**
```
Username: admin
Password: [admin password]
Expected: NO role switcher appears (single role only)
Current role: Administrator
```

**Step 2: Login as Manager**
```
Username: manager1
Password: [manager password]
Expected: Role switcher appears with badge showing "3"
Available roles: Manager, Auctioneer, Cashier
```

**Step 3: Login as Auctioneer**
```
Username: auctioneer1
Password: [auctioneer password]
Expected: Role switcher appears with badge showing "3"
Available roles: Auctioneer, Appraiser, Cashier
```

**Step 4: Login as Cashier**
```
Username: cashier1
Password: [cashier password]
Expected: NO role switcher appears (single role only)
Current role: Cashier
```

### Verify Role Switching

1. **Login as Manager**
2. **Click role switcher icon** (should show badge "3")
3. **Select "Auctioneer"** from dropdown
4. **Verify**:
   - ✅ Dashboard changes to Auctioneer Dashboard
   - ✅ Sidebar shows auctioneer menu items
   - ✅ Page title shows "Auctioneer Dashboard"
   - ✅ Role switcher still shows badge "3"
   - ✅ Checkmark appears on "Auctioneer" in dropdown
5. **Switch to "Cashier"**
6. **Verify**:
   - ✅ Dashboard changes to Cashier Dashboard
   - ✅ Sidebar shows cashier menu items
   - ✅ Page title shows "Cashier Dashboard"

## Code Files Modified

### Backend
- `pawn-api/routes/auth.js` (lines ~147-172)
  - Added `availableRoles` logic
  - Added `roles` field to login response

### Frontend
- `pawn-web/src/app/shared/navbar/navbar.html` (lines 79-163)
  - Created role switcher button with badge
  - Built dropdown menu with role list
- `pawn-web/src/app/shared/navbar/navbar.ts`
  - Added `roleMenuOpen` property
  - Updated `switchRole()` method
- `pawn-web/src/app/core/auth/auth.ts`
  - Added `hasMultipleRoles()` method
  - Added `getAvailableRoles()` method
  - Added `switchRole()` method
- `pawn-web/src/app/core/interfaces.ts`
  - Added `roles?: UserRole[] | string[]` to User interface

## Business Logic

### Why These Role Combinations?

**Administrator → Single Role Only**
- Admins have full system access
- For security, they operate in administrator mode only
- Can manage all aspects of the system without role switching

**Manager → Auctioneer + Cashier**
- Managers handle daily operations
- Can step in for auction management
- Can handle cashier duties when needed

**Auctioneer → Appraiser + Cashier**
- Auctioneers evaluate items for auction
- Work closely with appraisers
- Handle auction payment collection

## Future Enhancements

### Potential Improvements
1. **Database-Driven Roles**: Store role assignments in database
2. **Role Permissions**: Granular permissions per role
3. **Custom Role Combinations**: Admin panel to assign custom role sets
4. **Role Hierarchy**: Parent-child role relationships
5. **Time-Based Roles**: Temporary role access
6. **Audit Trail**: Track role switching in audit logs

### Database Schema (Future)
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES employees(id),
  role VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES employees(id)
);
```

## Troubleshooting

### Role Switcher Not Appearing

**Problem**: User has 3 roles but role switcher icon not visible

**Solution**:
1. **Check Backend Response**:
   ```javascript
   // Open browser console, check network tab
   // Login API response should include:
   {
     user: {
       role: "manager",
       roles: ["manager", "auctioneer", "cashier"] // ← Must be array
     }
   }
   ```

2. **Check localStorage**:
   ```javascript
   // Open browser console
   let user = JSON.parse(localStorage.getItem('currentUser'));
   console.log('Roles:', user.roles); // Should be array with multiple items
   ```

3. **Force Reload**:
   - Clear browser cache
   - Logout and login again
   - Check if backend server restarted after code changes

### Role Switching Not Working

**Problem**: Clicking role doesn't change dashboard

**Check**:
1. Browser console for errors
2. Router navigation logs
3. AuthService logs (should see "✅ Switched to role: xxx")

## Maintenance Notes

### When Adding New Roles
1. Update role assignment logic in `auth.js`
2. Add role icon SVG in `navbar.html`
3. Update this documentation
4. Test all role combinations

### Security Considerations
- Role validation happens on backend (JWT token)
- Frontend role switcher is UI convenience only
- API endpoints still check actual permissions
- Role switching doesn't bypass authorization

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
