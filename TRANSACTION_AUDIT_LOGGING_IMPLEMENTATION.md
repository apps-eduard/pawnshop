# Audit Logging - Transaction Trails Implementation

## Changes Made

### 1. Created Audit Logger Utility ✅
**File:** `pawn-api/utils/auditLogger.js`

Helper functions for logging to both audit tables:
- `logAudit()` - Logs to `audit_logs` (general system activities)
- `logAuditTrail()` - Logs to `audit_trails` (transaction-specific activities)
- `getIpAddress()` - Extracts IP address from request
- `getUserAgent()` - Extracts user agent from request

### 2. Updated Transaction Routes ✅
**File:** `pawn-api/routes/transactions.js`

**Changes:**
- Imported audit logger utility functions
- Fixed New Loan endpoint to use proper `audit_trails` table instead of incorrect `audit_logs` structure
- Added transaction audit trail logging on new loan creation with:
  - Transaction ID and loan number
  - User ID and username
  - Action type: "CREATE"
  - Description with principal amount and item count
  - Transaction data (new_data)
  - Amount, status, branch
  - IP address

**Before (lines 881-892):**
```javascript
// Wrong table structure
await client.query(`
  INSERT INTO audit_logs (
    entity_type, entity_id, action, user_id, changes, description
  ) VALUES ($1, $2, $3, $4, $5, $6)
`, [
  'transactions',
  transaction.id,
  'CREATE',
  req.user.id,
  JSON.stringify({ new_values: transaction }),
  'New loan transaction created'
]);
```

**After:**
```javascript
// Correct audit_trails structure
await logAuditTrail({
  transactionId: transaction.id,
  loanNumber: ticketNumber,
  userId: req.user.id,
  username: req.user.username,
  actionType: 'CREATE',
  description: `New loan created - Principal: ₱${principalAmount.toFixed(2)}, Items: ${items.length}`,
  oldData: null,
  newData: {
    transaction_number: ticketNumber,
    principal_amount: principalAmount,
    interest_rate: interestRate,
    total_amount: totalAmount,
    status: 'active',
    item_count: items.length
  },
  amount: principalAmount,
  statusBefore: null,
  statusAfter: 'active',
  branchId: req.user.branch_id || 1,
  ipAddress: getIpAddress(req),
  client
});
```

### 3. Updated Frontend Audit Viewer ✅
**File:** `pawn-web/src/app/features/audit/audit-viewer/audit-viewer.component.ts`

**Changes:**
- Set default date filter to TODAY for Audit Trails tab
- `dateFrom`: Current date (YYYY-MM-DD)
- `dateTo`: Current date (YYYY-MM-DD)

**Code:**
```typescript
trailsFilters: AuditFilters = { 
  page: 1, 
  limit: 50,
  dateFrom: new Date().toISOString().split('T')[0], // Default to today
  dateTo: new Date().toISOString().split('T')[0]     // Default to today
};
```

---

## How Transaction Audit Logging Works

### When Creating a New Loan:

1. **Transaction Created** in `transactions` table
2. **Audit Trail Logged** to `audit_trails` table with:
   ```json
   {
     "transaction_id": 9,
     "loan_number": "TXN-202510-000001",
     "user_id": 1,
     "username": "admin",
     "action_type": "CREATE",
     "description": "New loan created - Principal: ₱3500.00, Items: 2",
     "old_data": null,
     "new_data": {
       "transaction_number": "TXN-202510-000001",
       "principal_amount": 3500,
       "interest_rate": 3,
       "total_amount": 3610,
       "status": "active",
       "item_count": 2
     },
     "amount": 3500.00,
     "status_before": null,
     "status_after": "active",
     "branch_id": 1,
     "ip_address": "::1",
     "created_at": "2025-10-13T16:45:00Z"
   }
   ```

3. **View in Frontend:**
   - Navigate to **Audit Logs** menu
   - Click **Audit Trails** tab
   - Date filter automatically set to TODAY
   - See the new loan transaction in the list

---

## Testing

### 1. Create a New Loan
```bash
1. Login to frontend (http://localhost:4200)
2. Navigate to "New Loan" transaction
3. Fill in pawner details, items, and loan amount
4. Submit the transaction
```

### 2. View Audit Trail
```bash
1. Navigate to "Audit Logs" menu (admin only)
2. Click "Audit Trails" tab
3. You should see the new loan transaction listed with:
   - Loan Number: TXN-202510-XXXXXX
   - Username: Your username
   - Action Type: CREATE
   - Amount: The principal amount
   - Status: → active
   - Branch: Your branch name
   - Timestamp: When you created it
```

### 3. View Details
```bash
1. Click on the audit trail row
2. Modal opens showing:
   - Full description
   - Old Data: (null for new loans)
   - New Data: Transaction details in JSON format
   - All metadata (IP, timestamp, etc.)
```

---

## Next Steps - Add Audit Logging to Other Transactions

### Transactions to Update:

#### 1. **Redeem Transaction** (line ~1016)
```javascript
await logAuditTrail({
  transactionId: transaction.id,
  loanNumber: ticketNumber,
  userId: req.user.id,
  username: req.user.username,
  actionType: 'REDEMPTION',
  description: `Loan redeemed - Amount paid: ₱${totalPayment.toFixed(2)}`,
  oldData: { status: 'active', balance: oldBalance },
  newData: { status: 'redeemed', balance: 0 },
  amount: totalPayment,
  statusBefore: 'active',
  statusAfter: 'redeemed',
  branchId: req.user.branch_id || 1,
  ipAddress: getIpAddress(req),
  client
});
```

#### 2. **Partial Payment** (line ~1236)
```javascript
await logAuditTrail({
  transactionId: transaction.id,
  loanNumber: ticketNumber,
  userId: req.user.id,
  username: req.user.username,
  actionType: 'PAYMENT',
  description: `Partial payment received - Amount: ₱${amountPaid.toFixed(2)}`,
  oldData: { balance: oldBalance },
  newData: { balance: newBalance },
  amount: amountPaid,
  statusBefore: 'active',
  statusAfter: 'active',
  branchId: req.user.branch_id || 1,
  ipAddress: getIpAddress(req),
  client
});
```

#### 3. **Additional Loan** (line ~1506)
```javascript
await logAuditTrail({
  transactionId: transaction.id,
  loanNumber: ticketNumber,
  userId: req.user.id,
  username: req.user.username,
  actionType: 'ADDITIONAL_LOAN',
  description: `Additional loan granted - Amount: ₱${additionalAmount.toFixed(2)}`,
  oldData: { principal: oldPrincipal },
  newData: { principal: newPrincipal },
  amount: additionalAmount,
  statusBefore: 'active',
  statusAfter: 'active',
  branchId: req.user.branch_id || 1,
  ipAddress: getIpAddress(req),
  client
});
```

#### 4. **Renew Transaction** (line ~1733)
```javascript
await logAuditTrail({
  transactionId: transaction.id,
  loanNumber: newTicketNumber,
  userId: req.user.id,
  username: req.user.username,
  actionType: 'RENEWAL',
  description: `Loan renewed - New ticket: ${newTicketNumber}`,
  oldData: { ticket: oldTicketNumber, maturity: oldMaturityDate },
  newData: { ticket: newTicketNumber, maturity: newMaturityDate },
  amount: principalAmount,
  statusBefore: 'active',
  statusAfter: 'active',
  branchId: req.user.branch_id || 1,
  ipAddress: getIpAddress(req),
  client
});
```

---

## Files Changed Summary

### Created:
1. ✅ `pawn-api/utils/auditLogger.js` - Audit logging utility

### Modified:
1. ✅ `pawn-api/routes/transactions.js` - Added audit trail to new loan
2. ✅ `pawn-web/src/app/features/audit/audit-viewer/audit-viewer.component.ts` - Default date filter to today

---

## Benefits

1. **Transaction History:** Complete audit trail of all loan activities
2. **Compliance:** Meets financial audit requirements
3. **Troubleshooting:** Easy to track what happened and when
4. **User Accountability:** Know who performed each action
5. **Data Recovery:** Old/new values allow data restoration if needed
6. **Security:** IP addresses tracked for suspicious activity detection

---

## Verification

### Check Audit Trail in Database:
```sql
SELECT 
  id, loan_number, username, action_type, description, 
  amount, status_after, created_at
FROM audit_trails
WHERE action_type = 'CREATE'
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Result After Creating New Loan:
```
id | loan_number        | username | action_type | amount  | status_after
---+--------------------+----------+-------------+---------+-------------
1  | TXN-202510-000001 | admin    | CREATE      | 3500.00 | active
```

---

*Implementation completed: October 13, 2025*
*Status: ✅ New Loan audit logging complete*
*Todo: Add audit logging to Redeem, Partial Payment, Additional Loan, and Renew transactions*
