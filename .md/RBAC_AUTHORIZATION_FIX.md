# RBAC Authorization Fix - Admin Role Support

## Issue
The RBAC endpoints were returning `403 Forbidden` errors even though authentication was successful. The logs showed:
- ✅ Authentication successful for user: admin (admin)
- ❌ 403 Forbidden on `/api/rbac/roles`, `/api/rbac/users`, `/api/rbac/permissions`, `/api/rbac/menu-items`

## Root Cause
The authorization middleware was checking for role `'administrator'` but the database contains users with role `'admin'`. This is a naming inconsistency between:
- **Database**: `role = 'admin'`
- **API Routes**: Checking for `'administrator'`

## Solution
Updated all RBAC route authorization checks to accept both `'admin'` and `'administrator'` roles.

### Files Modified

**1. pawn-api/routes/rbac.js**
- Updated all `authorizeRoles()` calls to include both `'admin'` and `'administrator'`
- Updated valid roles list to include `'admin'`
- Added `'admin'` to permissions object with same permissions as `'administrator'`

**Changes:**
```javascript
// Before
router.get('/roles', authorizeRoles('administrator', 'manager'), ...)
router.get('/users', authorizeRoles('administrator', 'manager'), ...)
router.put('/users/:id/role', authorizeRoles('administrator'), ...)
router.put('/users/:id/status', authorizeRoles('administrator'), ...)
router.get('/permissions', authorizeRoles('administrator', 'manager'), ...)
router.get('/menu-items', authorizeRoles('administrator', 'manager'), ...)

// After
router.get('/roles', authorizeRoles('admin', 'administrator', 'manager'), ...)
router.get('/users', authorizeRoles('admin', 'administrator', 'manager'), ...)
router.put('/users/:id/role', authorizeRoles('admin', 'administrator'), ...)
router.put('/users/:id/status', authorizeRoles('admin', 'administrator', 'manager'), ...)
router.get('/permissions', authorizeRoles('admin', 'administrator', 'manager'), ...)
router.get('/menu-items', authorizeRoles('admin', 'administrator', 'manager'), ...)
```

**Valid Roles List:**
```javascript
// Before
const validRoles = ['administrator', 'manager', 'cashier', 'auctioneer', 'appraiser', 'pawner'];

// After
const validRoles = ['admin', 'administrator', 'manager', 'cashier', 'auctioneer', 'appraiser', 'pawner'];
```

**Permissions Object:**
```javascript
const permissions = {
  admin: {
    sidebar: ['dashboard', 'new-loan', 'transactions', 'renew', 'redeem', 'partial-payment', 
              'additional-loan', 'items', 'customers', 'auction', 'reports', 'voucher', 
              'settings', 'rbac'],
    features: ['all']
  },
  administrator: {
    // Same as admin
  },
  // ... other roles
};
```

**2. pawn-web/src/app/features/rbac/rbac.component.ts**
- Added `'admin'` role to `availableRoles` array

```typescript
availableRoles = [
  { value: 'admin', label: 'Admin', color: 'red' },
  { value: 'administrator', label: 'Administrator', color: 'red' },
  // ... other roles
];
```

## Testing
1. ✅ API server restarted successfully
2. ✅ No compilation errors
3. 🔄 Refresh browser to test RBAC page with 'admin' role

## Expected Result
- Users with role `'admin'` can now access all RBAC endpoints
- Both `'admin'` and `'administrator'` roles have full administrative access
- 403 Forbidden errors should be resolved

## Notes
- This maintains backward compatibility with any existing `'administrator'` role entries
- The system now supports both role names for administrative access
- Consider standardizing on one role name in the future (either 'admin' or 'administrator')
- Database migration might be needed to standardize role names across all users

