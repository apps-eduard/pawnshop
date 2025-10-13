# Audit System Documentation

## Overview
The pawnshop system has TWO separate audit/logging tables with different purposes:

---

## 1. `audit_logs` - General System Audit Log

### Purpose
Tracks **ALL system activities** including user actions, CRUD operations, and general system events.

### Schema
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,           -- Action performed
    table_name VARCHAR(50),                 -- Table affected
    record_id INTEGER,                      -- Record ID affected
    old_values JSONB,                       -- Before state
    new_values JSONB,                       -- After state
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Common Actions
- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `LOGOUT`
- `CREATE` / `UPDATE` / `DELETE` (for any table)
- `VIEW` / `EXPORT`
- `PERMISSION_CHANGE`
- `ROLE_ASSIGNED`

### Use Cases
- Security auditing
- User activity tracking
- Permission changes
- General system monitoring
- Compliance reporting

---

## 2. `audit_trails` - Transaction-Specific Audit Trail

### Purpose
Specifically tracks **TRANSACTION and LOAN activities** for financial compliance and detailed transaction history.

### Schema
```sql
CREATE TABLE IF NOT EXISTS audit_trails (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER,
    loan_number VARCHAR(20),
    user_id INTEGER,
    username VARCHAR(50),
    action_type VARCHAR(50) NOT NULL,       -- CREATE, UPDATE, DELETE, PAYMENT, RENEWAL
    description TEXT NOT NULL,
    old_data JSONB,                         -- Previous transaction state
    new_data JSONB,                         -- New transaction state
    amount DECIMAL(15,2),                   -- Transaction amount
    status_before VARCHAR(20),              -- Status before action
    status_after VARCHAR(20),               -- Status after action
    branch_id INTEGER REFERENCES branches(id),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES employees(id)
);
```

### Common Action Types
- `CREATE` - New loan/transaction created
- `UPDATE` - Transaction details modified
- `PAYMENT` - Payment received (partial, full)
- `RENEWAL` - Loan renewed
- `REDEMPTION` - Item redeemed
- `AUCTION` - Item auctioned
- `ADDITIONAL_LOAN` - Additional loan added
- `STATUS_CHANGE` - Status changed (active, expired, redeemed, etc.)

### Use Cases
- Financial auditing
- Transaction history
- Loan lifecycle tracking
- Dispute resolution
- Regulatory compliance
- Customer service inquiries

---

## API Endpoints

### Audit Logs (General System)

#### GET /api/audit/logs
Get all audit logs with pagination and filtering

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `action` - Filter by action type
- `user_id` - Filter by user
- `table_name` - Filter by table
- `dateFrom` - Start date
- `dateTo` - End date
- `search` - Search username, action, or table name

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "user_id": 5,
        "username": "admin",
        "action": "LOGIN_SUCCESS",
        "table_name": null,
        "record_id": null,
        "old_values": null,
        "new_values": null,
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2025-10-13T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalRecords": 500,
      "pageSize": 50
    }
  }
}
```

#### GET /api/audit/logs/actions
Get distinct action types

#### GET /api/audit/logs/tables
Get distinct table names

---

### Audit Trails (Transaction-Specific)

#### GET /api/audit/trails
Get all audit trails with pagination and filtering

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `action_type` - Filter by action type
- `transaction_id` - Filter by transaction
- `loan_number` - Filter by loan number
- `user_id` - Filter by user
- `branch_id` - Filter by branch
- `dateFrom` - Start date
- `dateTo` - End date
- `search` - Search username, loan number, or description

**Response:**
```json
{
  "success": true,
  "data": {
    "trails": [
      {
        "id": 1,
        "transaction_id": 123,
        "loan_number": "PN-2025-00123",
        "user_id": 5,
        "username": "cashier1",
        "action_type": "PAYMENT",
        "description": "Partial payment received",
        "old_data": { "balance": 5000 },
        "new_data": { "balance": 3000 },
        "amount": 2000.00,
        "status_before": "active",
        "status_after": "active",
        "branch_id": 1,
        "branch_name": "Main Branch",
        "ip_address": "192.168.1.1",
        "created_at": "2025-10-13T10:30:00Z",
        "created_by": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalRecords": 500,
      "pageSize": 50
    }
  }
}
```

#### GET /api/audit/trails/action-types
Get distinct action types from audit trails

#### GET /api/audit/trails/transaction/:transactionId
Get all audit trails for a specific transaction

---

### Statistics

#### GET /api/audit/stats
Get audit statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 10000,
    "totalTrails": 5000,
    "todayLogs": 150,
    "todayTrails": 75,
    "topActions": [
      { "action": "LOGIN_SUCCESS", "count": 45 },
      { "action": "VIEW", "count": 30 }
    ],
    "topUsers": [
      { "username": "cashier1", "count": 50 },
      { "username": "admin", "count": 35 }
    ]
  }
}
```

---

## Key Differences Summary

| Feature | audit_logs | audit_trails |
|---------|-----------|--------------|
| **Purpose** | General system activities | Transaction-specific activities |
| **Scope** | All tables & actions | Transactions & loans only |
| **Detail Level** | Generic CRUD | Financial transactions |
| **Key Fields** | table_name, action | transaction_id, loan_number, amount |
| **Status Tracking** | No | Yes (status_before/after) |
| **Amount Tracking** | No | Yes |
| **Branch Tracking** | No | Yes |
| **Use Case** | Security & compliance | Financial auditing & history |

---

## When to Use Each Table

### Use `audit_logs` when:
- ✅ Tracking user login/logout
- ✅ Recording permission changes
- ✅ Monitoring user management activities
- ✅ Auditing system configuration changes
- ✅ General CRUD operations on any table

### Use `audit_trails` when:
- ✅ Tracking loan lifecycle (create → renew → redeem → auction)
- ✅ Recording payment history
- ✅ Monitoring transaction status changes
- ✅ Financial compliance reporting
- ✅ Customer service inquiries about transactions
- ✅ Dispute resolution

---

## Frontend Implementation Plan

### 1. Create Audit Logs Viewer Component
- **Location:** `pawn-web/src/app/features/audit/audit-logs/`
- **Features:**
  - Filterable table with pagination
  - Filter by action, user, table, date range
  - Search functionality
  - Export to CSV/Excel
  - View details modal (old/new values comparison)

### 2. Create Audit Trails Viewer Component
- **Location:** `pawn-web/src/app/features/audit/audit-trails/`
- **Features:**
  - Filterable table with pagination
  - Filter by action type, loan number, user, branch, date range
  - Transaction timeline view
  - Amount tracking
  - Status change visualization
  - Export capabilities

### 3. Create Audit Dashboard
- **Location:** `pawn-web/src/app/features/audit/audit-dashboard/`
- **Features:**
  - Statistics overview
  - Today's activity charts
  - Top users/actions
  - Recent activity feed
  - Quick filters

### 4. Add to Menu
Add "Audit Logs" menu item under Management or as standalone menu for administrators.

---

## Security Considerations

1. **Access Control:**
   - Only administrators should have access to audit logs
   - Managers may have read-only access to audit trails for their branch
   - Regular users should not see audit data

2. **Data Retention:**
   - Implement automatic archival after 90 days
   - Keep critical financial trails longer (1+ years)

3. **Performance:**
   - Indexes already created on common query fields
   - Use pagination for large datasets
   - Consider data archival for very old logs

---

## Next Steps

1. ✅ Backend API created (`routes/audit.js`)
2. ✅ API routes registered in server
3. ⏳ Create frontend service (`audit.service.ts`)
4. ⏳ Create audit logs viewer component
5. ⏳ Create audit trails viewer component
6. ⏳ Create audit dashboard
7. ⏳ Add audit menu items
8. ⏳ Test with sample data
