# Pawner Dashboard / Kiosk Mode

## Overview

The **Pawner Dashboard** serves as a self-service kiosk interface for customers to join the queue system.

## Access

### Login Credentials
- **Username**: `pawner1`
- **Password**: `password123`
- **Role**: pawner

### URL
After login, pawner users are redirected to:
```
http://localhost:4200/dashboard/pawner
```

## Features

The Pawner Dashboard (Kiosk Mode) allows customers to:

1. **Select Transaction Type**
   - New Loan
   - Redeem
   - Renew
   - Additional Loan
   - Partial Payment

2. **Customer Type Selection**
   - New Customer (Registration required)
   - Existing Customer (Search by ticket or mobile)

3. **Queue Management**
   - Join queue
   - Get queue number
   - View current position
   - Check estimated wait time

4. **Self-Service Flow**
   - Kiosk mode automatically resets after each transaction
   - Ready for next customer immediately
   - No logout required between customers

## Configuration Status

### ✅ Already Configured
- [x] Pawner role exists in database
- [x] Pawner1 user created (seeds/02_demo_employees.js)
- [x] Dashboard route configured (app.routes.ts → /dashboard/pawner)
- [x] Pawner Dashboard component exists
- [x] Kiosk mode functionality implemented
- [x] Auth service supports pawner role
- [x] Navbar supports pawner dashboard

### Current Setup
```typescript
// Auth Service (auth.ts)
case 'pawner':
case UserRole.PAWNER:
  return '/dashboard/pawner';

// Dashboard Routes (dashboard.routes.ts)
{
  path: 'pawner',
  component: PawnerDashboard,
  data: { roles: ['pawner'] }
}
```

## Authorization Issue

If you see "Not Authorized" or similar error:

### Check #1: Auth Guard
The auth guard is currently commented out in routes. This should allow access:
```typescript
// canActivate: [AuthGuard],  // ← Currently disabled
```

### Check #2: Token & Role
After login, check browser console:
```javascript
// In browser console:
localStorage.getItem('token')
localStorage.getItem('user')
```

Should show:
```json
{
  "username": "pawner1",
  "role": "pawner",
  ...
}
```

### Check #3: Backend Authentication
Test pawner1 login:
```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"pawner1","password":"password123"}'
```

Should return token with role: "pawner"

## Kiosk Mode Behavior

### Auto-Reset Flow
```
1. Customer selects service type → 
2. Chooses customer type (new/existing) → 
3. Searches/registers → 
4. Joins queue → 
5. Gets queue number → 
6. [AUTO RESET] → Back to step 1 for next customer
```

### Code Location
File: `pawn-web/src/app/features/dashboards/pawner-dashboard/pawner-dashboard.ts`

Key kiosk features (lines 173, 313, 355):
- Auto-reset after queue entry
- No logout between customers
- Continuous operation mode

## Usage Instructions

### For Kiosk Deployment

1. **Login Once**
   - Use pawner1 account
   - System stays logged in

2. **Place Kiosk Device**
   - Position in customer-accessible area
   - Connect to touchscreen if available
   - Ensure stable internet connection

3. **Customer Flow**
   - Customer approaches kiosk
   - Selects transaction type
   - Follows on-screen prompts
   - Receives queue number
   - Kiosk resets for next customer

4. **Maintenance**
   - No staff interaction needed
   - Auto-reset keeps kiosk ready
   - Monitor queue widget for capacity

## Troubleshooting

### Issue: "Not Authorized" after login

**Possible Causes:**
1. Auth guard enabled but checking wrong role
2. Token not properly stored
3. Role mismatch in database vs code

**Solutions:**

**Option 1: Verify Pawner User in Database**
```sql
SELECT id, username, role, is_active 
FROM employees 
WHERE username = 'pawner1';
```
Should return: `role = 'pawner'`, `is_active = true`

**Option 2: Check Frontend Role Enum**
File: `pawn-web/src/app/core/models/user.model.ts`
Ensure `PAWNER` is defined in `UserRole` enum

**Option 3: Enable Auth Guard Properly**
If you want to enable auth guard, update dashboard.routes.ts:
```typescript
{
  path: 'pawner',
  component: PawnerDashboard,
  canActivate: [AuthGuard],  // Uncomment this
  data: { roles: ['pawner'] }  // Ensure 'pawner' is in allowed roles
}
```

### Issue: Login successful but redirects to login

**Solution:**
Check `auth.ts` getDashboardRoute():
```typescript
// Should have:
case 'pawner':
case UserRole.PAWNER:
  return '/dashboard/pawner';
```

### Issue: Frontend can't connect to backend

**Check:**
1. Backend running on port 3000
2. CORS enabled for localhost:4200
3. Health endpoint responding:
   ```
   http://localhost:3000/health
   ```

## Testing Pawner Access

### Test Steps

1. **Clear Browser Data**
   ```javascript
   localStorage.clear();
   ```

2. **Login as Pawner**
   - Go to http://localhost:4200/login
   - Username: `pawner1`
   - Password: `password123`

3. **Verify Redirect**
   - Should redirect to: `/dashboard/pawner`
   - URL should be: `http://localhost:4200/dashboard/pawner`

4. **Check Console**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

5. **Test Kiosk Flow**
   - Select "New Loan"
   - Choose "New Customer"
   - Fill registration form
   - Submit and get queue number
   - Verify auto-reset

## Default Configuration

### All Users Created by setup.ps1
| Username | Role | Access |
|----------|------|--------|
| admin | administrator | Full system access |
| cashier1 | cashier | Transaction processing |
| cashier2 | cashier | Transaction processing |
| manager1 | manager | Reports and oversight |
| appraiser1 | appraiser | Appraisals and pawner management |
| appraiser2 | appraiser | Appraisals and pawner management |
| auctioneer1 | auctioneer | Auction management |
| **pawner1** | **pawner** | **Kiosk/Queue system** |

All passwords: `password123`

## Summary

- ✅ Pawner role and user exist
- ✅ Dashboard component exists
- ✅ Routes configured
- ✅ Kiosk mode implemented
- ✅ Auto-reset functionality
- ⚠️ Auth guard currently disabled
- 🎯 Purpose: Self-service queue kiosk

**If you're seeing authorization errors**, please share the exact error message from the browser console so I can identify the specific issue.
