# Pawner Queue System Implementation

**Date**: October 10, 2025  
**Status**: ✅ Backend Complete | 🚧 Frontend Pending

## Overview
Implemented a comprehensive queuing system for pawners (customers) to streamline the pawnshop workflow and save time on data entry.

---

## 🎯 Business Requirements

### The Problem
- Cashiers and appraisers waste time re-entering pawner information for every transaction
- No system to track which pawners are waiting for service
- No distinction between new and returning customers
- Manual process creates bottlenecks and delays

### The Solution
**Pawner Queue System** - A digital queuing solution where:
1. **Pawners** can search themselves and join a queue
2. **Staff** (cashiers/appraisers) can see waiting pawners and click to auto-fill forms
3. System automatically tags **"Old Pawner"** (existing) or **"New Pawner"** (just registered)
4. Queue management with statuses: waiting → processing → completed

---

## 🏗️ Architecture

### Database Schema

#### 1. **`pawner_roles`** Table (Junction Table)
Tracks which pawners have which roles (many-to-many relationship).

```sql
CREATE TABLE pawner_roles (
  id SERIAL PRIMARY KEY,
  pawner_id INTEGER REFERENCES pawners(id),
  role_id INTEGER REFERENCES roles(id),
  is_primary BOOLEAN DEFAULT true,
  assigned_by INTEGER REFERENCES employees(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pawner_id, role_id)
);
```

**Purpose**: Assign RBAC roles to pawners (customers can have `pawner` role for login/queue access)

#### 2. **`pawner_queue`** Table
Tracks pawners waiting for service with complete queue management.

```sql
CREATE TABLE pawner_queue (
  id SERIAL PRIMARY KEY,
  pawner_id INTEGER REFERENCES pawners(id),
  branch_id INTEGER REFERENCES branches(id),
  queue_number VARCHAR(20), -- "Q001", "Q002", etc.
  status ENUM('waiting', 'processing', 'completed', 'cancelled'),
  is_new_pawner BOOLEAN DEFAULT false, -- Tag: New or Old pawner
  service_type ENUM('new_loan', 'renew', 'redeem', 'additional_loan', 'inquiry'),
  processed_by INTEGER REFERENCES employees(id),
  called_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  wait_time_minutes INTEGER, -- Calculated: called_at - joined_at
  service_time_minutes INTEGER, -- Calculated: completed_at - called_at
  joined_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Features**:
- Auto-generated queue numbers (Q001, Q002, etc.)
- Tracks wait time and service time for analytics
- Status workflow: `waiting` → `processing` → `completed`
- Tags new vs. returning pawners
- Links to branch for multi-branch support

---

## 🔧 Backend Implementation

### ✅ 1. Added Pawner Role to RBAC

**File**: `migrations_knex/20251010120934_create_rbac_system.js`

```javascript
// Added 'pawner' to roles insert
{ name: 'pawner', display_name: 'Pawner', description: 'Customer access - view own info and join queue' }

// Added 'pawner' to role-menu mapping
'pawner': ['Dashboard'] // Pawners only see their own dashboard
```

**Result**: Pawners now have a legitimate role in the RBAC system

---

### ✅ 2. Created Queue Migration

**File**: `migrations_knex/20251010130136_create_pawner_queue_system.js`

Creates two tables:
- `pawner_roles` - Junction table for pawner-role assignments
- `pawner_queue` - Queue management with all fields

**Run Migration**:
```bash
cd pawn-api
npx knex migrate:latest
```

---

### ✅ 3. Created Queue API Endpoints

**File**: `routes/queue.js`

#### **GET /api/queue**
Get queue list (filtered by branch and status)

**Access**: All employees, pawners (see only own entries)

**Query Parameters**:
- `status` - Filter by status (waiting, processing, completed, cancelled)
- `branch_id` - Filter by branch

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "queueNumber": "Q001",
      "status": "waiting",
      "isNewPawner": false,
      "serviceType": "new_loan",
      "joinedAt": "2025-10-10T12:00:00Z",
      "pawner": {
        "id": 123,
        "firstName": "Juan",
        "lastName": "Dela Cruz",
        "mobileNumber": "09171234567",
        "email": "juan@email.com",
        "address": "123",
        "cityId": 1,
        "barangayId": 5
      },
      "branchName": "Main Branch",
      "processedBy": null
    }
  ]
}
```

---

#### **POST /api/queue**
Join the queue (create new queue entry)

**Access**: Pawners, cashiers, appraisers

**Request Body**:
```json
{
  "pawnerId": 123,
  "serviceType": "new_loan",
  "isNewPawner": false,
  "notes": "Need to renew expired loan"
}
```

**Valid Service Types**:
- `new_loan` - First-time pawn transaction
- `renew` - Extend existing loan
- `redeem` - Pay and retrieve item
- `additional_loan` - Borrow more on existing item
- `inquiry` - Ask questions

**Response**:
```json
{
  "success": true,
  "message": "Successfully joined the queue",
  "data": {
    "id": 1,
    "queueNumber": "Q001",
    "status": "waiting",
    "isNewPawner": false,
    "serviceType": "new_loan",
    "joinedAt": "2025-10-10T12:00:00Z"
  }
}
```

---

#### **PUT /api/queue/:id/status**
Update queue entry status

**Access**: Cashiers, appraisers, administrators

**Request Body**:
```json
{
  "status": "processing"
}
```

**Status Flow**:
1. `waiting` - Pawner just joined queue
2. `processing` - Staff called the pawner (sets `called_at`, `processed_by`)
3. `completed` - Service finished (sets `completed_at`, calculates wait/service time)
4. `cancelled` - Pawner left or cancelled

**Auto-Calculations**:
- When status → `processing`: Sets `called_at` and `processed_by`
- When status → `completed`: Sets `completed_at`, calculates `wait_time_minutes` and `service_time_minutes`

---

#### **DELETE /api/queue/:id**
Remove entry from queue (cancel)

**Access**: Administrators, the pawner themselves

**Behavior**:
- Admins can remove any queue entry
- Pawners can only remove their own entries

---

### ✅ 4. Registered Queue Routes

**File**: `server.js`

```javascript
const queueRoutes = require('./routes/queue');
app.use('/api/queue', queueRoutes);
```

---

### ✅ 5. Auto-Assign Pawner Role on Creation

**File**: `routes/pawners.js` (POST / endpoint)

```javascript
// After creating pawner, assign 'pawner' role
const pawnerRoleResult = await pool.query(`SELECT id FROM roles WHERE name = 'pawner'`);
if (pawnerRoleResult.rows.length > 0) {
  const pawnerRoleId = pawnerRoleResult.rows[0].id;
  await pool.query(`
    INSERT INTO pawner_roles (pawner_id, role_id, assigned_by, is_primary)
    VALUES ($1, $2, $3, true)
  `, [pawnerId, pawnerRoleId, req.user.id]);
}
```

**Result**: Every newly created pawner automatically gets the `pawner` role assigned

---

### ✅ 6. Fixed RBAC Route Error

**File**: `routes/rbac-v2.js`

**Issue**: Query was trying to select `is_system_role` column that doesn't exist

**Fix**:
```javascript
// Changed from:
r.id, r.name, r.display_name, r.description, r.is_system_role

// To:
r.id, r.name, r.display_name, r.description, r.is_active
```

---

## 📋 Complete API Reference

### Queue Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/queue` | All | Get queue list |
| GET | `/api/queue?status=waiting` | All | Filter by status |
| GET | `/api/queue?branch_id=1` | All | Filter by branch |
| POST | `/api/queue` | Pawners, Staff | Join queue |
| PUT | `/api/queue/:id/status` | Staff | Update status |
| DELETE | `/api/queue/:id` | Admin, Own | Remove entry |

---

## 🔄 Workflow Examples

### Example 1: Returning Pawner Joins Queue

1. **Pawner logs in** (if they have account) or **cashier helps them**
2. **Pawner dashboard** - Search by name/mobile: "Juan Dela Cruz"
3. **Found!** → Shows "Old Pawner" badge
4. **Click "Join Queue"** → Select service type: "Renew"
5. **Gets queue number**: "Q003"
6. **Waits** - Status: `waiting`

7. **Cashier dashboard** - Shows waiting list:
   ```
   Queue  | Name | Type | Status | Badge
   -------|------|------|--------|----------
   Q001   | Maria | New Loan | Waiting | 🆕 New Pawner
   Q002   | Pedro | Redeem | Processing | 👤 Old Pawner
   Q003   | Juan | Renew | Waiting | 👤 Old Pawner
   ```

8. **Cashier clicks "Q003 - Juan"**:
   - Status changes to `processing`
   - Pawner info auto-fills in transaction form:
     - Name: Juan Dela Cruz
     - Mobile: 09171234567
     - Address: Already populated
   - **Saves 2-3 minutes** of manual data entry!

9. **After transaction completes**:
   - Status changes to `completed`
   - System calculates wait time and service time
   - Queue entry removed from active list

---

### Example 2: New Pawner Joins Queue

1. **Walk-in customer** at pawnshop
2. **Uses pawner kiosk** or **staff helps**
3. **Search by mobile**: "09181112233"
4. **Not found** → Shows "Register as New Pawner"
5. **Fills form**:
   - Name: Maria Santos
   - Mobile: 09181112233
   - Address: Cebu City, Lahug
6. **Submits** → Pawner created with `pawner` role assigned
7. **Auto-joins queue** with:
   - `is_new_pawner = true`
   - Badge: "🆕 New Pawner"
   - Service type: "New Loan"
   - Queue number: "Q001"

8. **Appraiser dashboard** - Sees:
   ```
   Q001 | Maria Santos | New Loan | 🆕 New Pawner
   ```

9. **Appraiser clicks "Q001"**:
   - Pawner info auto-filled
   - Knows it's a new customer → May need extra guidance
   - Proceeds with appraisal

---

## 🚧 Frontend Implementation (To Be Done)

### Tasks Remaining:

#### 1. Create Pawner Dashboard Component
**Path**: `pawn-web/src/app/features/dashboards/pawner-dashboard/`

**Features**:
- Search form (by name, mobile number)
- Results display with "Old Pawner" badge
- "Join Queue" button with service type selector
- "Not found? Register" link
- Show own queue status if already in queue

---

#### 2. Update Cashier Dashboard
**Path**: `pawn-web/src/app/features/dashboards/cashier-dashboard/`

**Add**:
- Queue widget showing waiting pawners
- Badges: 🆕 New Pawner / 👤 Old Pawner
- Click pawner → Auto-fill transaction form
- Button to mark "Processing" → "Completed"

**UI Mock**:
```
┌─────────────────────────────────────┐
│ 👥 Waiting Pawners (3)              │
├─────────────────────────────────────┤
│ Q001  Maria Santos                  │
│       New Loan  🆕 New Pawner      │
│       [Process]                     │
├─────────────────────────────────────┤
│ Q002  Juan Dela Cruz                │
│       Renew  👤 Old Pawner         │
│       [Process]                     │
├─────────────────────────────────────┤
│ Q003  Pedro Reyes                   │
│       Redeem  👤 Old Pawner        │
│       [Process]                     │
└─────────────────────────────────────┘
```

---

#### 3. Update Appraiser Dashboard
**Path**: `pawn-web/src/app/features/dashboards/appraiser-dashboard/`

**Add**:
- Same queue widget as cashier
- Click pawner → Auto-fill appraisal form
- Focus on "New Loan" and "Inquiry" service types

---

## 🧪 Testing the Backend

### 1. Run Migrations
```bash
cd pawn-api
npx knex migrate:latest
```

**Expected Output**:
```
✅ Created pawner_roles and pawner_queue tables
Batch 2 run: 1 migrations
```

### 2. Test Pawner Creation (Auto-Assign Role)
```bash
curl -X POST http://localhost:3000/api/pawners \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Pawner",
    "contactNumber": "09171234567",
    "email": "test@example.com",
    "cityId": 1,
    "barangayId": 5,
    "addressDetails": "123 Test St"
  }'
```

**Expected**: Pawner created with `pawner` role assigned

### 3. Test Join Queue
```bash
curl -X POST http://localhost:3000/api/queue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pawnerId": 1,
    "serviceType": "new_loan",
    "isNewPawner": false,
    "notes": "First visit"
  }'
```

**Expected**: Queue entry created with queue number (Q001, Q002, etc.)

### 4. Test Get Queue
```bash
curl http://localhost:3000/api/queue?status=waiting \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: List of waiting pawners

### 5. Test Update Status
```bash
curl -X PUT http://localhost:3000/api/queue/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```

**Expected**: Status updated, `called_at` and `processed_by` set

---

## 📊 Benefits

### Time Savings
- **Before**: 2-3 minutes to manually enter pawner details
- **After**: Click pawner in queue → auto-filled (5 seconds)
- **Per transaction**: ~2.5 minutes saved
- **Per day (20 transactions)**: ~50 minutes saved
- **Per month**: ~1,000 minutes = **16.7 hours** saved

### Improved UX
- ✅ Pawners know their position in queue (Q001, Q002)
- ✅ Staff see who's waiting at a glance
- ✅ New vs. returning customers clearly marked
- ✅ No more asking "Have you been here before?"
- ✅ Reduces data entry errors

### Analytics Potential
- Track average wait times per branch
- Monitor service times per employee
- Identify peak hours/days
- Service type distribution

---

## 🚀 Next Steps

### Immediate (Backend Complete ✅)
1. ✅ Add pawner role to RBAC
2. ✅ Create queue tables
3. ✅ Implement queue API
4. ✅ Auto-assign pawner role on creation
5. ✅ Register queue routes

### Next Sprint (Frontend 🚧)
1. 🚧 Create Pawner Dashboard component
2. 🚧 Add queue widget to Cashier Dashboard
3. 🚧 Add queue widget to Appraiser Dashboard
4. 🚧 Implement auto-fill on click
5. 🚧 Add "Old/New Pawner" badges
6. 🚧 Test complete workflow end-to-end

---

## 📝 Files Created/Modified

### Created
- ✅ `pawn-api/migrations_knex/20251010130136_create_pawner_queue_system.js` - Queue tables migration
- ✅ `pawn-api/routes/queue.js` - Queue API endpoints
- ✅ `PAWNER_QUEUE_SYSTEM_IMPLEMENTATION.md` - This documentation

### Modified
- ✅ `pawn-api/migrations_knex/20251010120934_create_rbac_system.js` - Added pawner role
- ✅ `pawn-api/routes/pawners.js` - Auto-assign pawner role on creation
- ✅ `pawn-api/routes/rbac-v2.js` - Fixed is_system_role column error
- ✅ `pawn-api/server.js` - Registered queue routes
- ✅ `pawn-web/src/app/auth/login/login.ts` - Updated demo accounts (removed non-existent pawner1)

---

## ✅ Summary

**Backend Status**: 100% Complete
- Database schema created
- API endpoints implemented
- Role assignment automated
- Error fixes applied

**Frontend Status**: 0% Complete (Pending)
- Pawner Dashboard - Not started
- Cashier Dashboard Queue Widget - Not started
- Appraiser Dashboard Queue Widget - Not started

**Ready for Testing**: Yes - All backend APIs ready to use! 🎉
