# How the System Knows a Transaction is "Closed"

## Overview
The system uses **two complementary methods** to determine if a transaction is closed or superseded:

1. **Transaction History Chain** (Frontend validation)
2. **Transaction Status** (Backend + Frontend validation)

---

## Method 1: Transaction History Chain ✅ (NEW - Just Implemented)

### How It Works

When you search for a transaction (e.g., `TXN-202510-000014`), the **backend API** returns:

```json
{
  "success": true,
  "data": {
    "id": 14,
    "ticketNumber": "TXN-202510-000014",
    "trackingNumber": "TXN-202510-000014",
    "status": "active",
    "principalAmount": 2700,
    ...
    "transactionHistory": [
      {
        "id": 14,
        "transactionNumber": "TXN-202510-000014",
        "transactionType": "new_loan",
        "status": "active",
        "createdAt": "2025-10-03T10:30:00.000Z"
      },
      {
        "id": 17,
        "transactionNumber": "TXN-202510-000017",
        "transactionType": "renewal",
        "status": "active",
        "createdAt": "2025-10-08T12:45:00.000Z"  ← LATEST!
      }
    ]
  }
}
```

### Backend Query (API)

**File:** `pawn-api/routes/transactions.js` (Lines 53-88)

```javascript
// Step 2: Get ALL transactions in the chain using tracking_number
const chainQuery = await pool.query(`
  SELECT 
    t.id,
    t.transaction_number,
    t.tracking_number,
    t.previous_transaction_number,
    t.transaction_type,
    t.status,
    t.created_at,
    t.updated_at,
    ...
  FROM transactions t
  WHERE t.tracking_number = $1    ← Get ALL transactions with same tracking number
  ORDER BY t.created_at ASC        ← Sort by creation date
`, [trackingNumber]);

// Step 3: Get the LATEST transaction (current state)
const currentTransaction = chainQuery.rows[chainQuery.rows.length - 1];
```

**What this does:**
1. Finds ALL transactions with the same `tracking_number`
2. Orders them by `created_at` timestamp (oldest to newest)
3. Returns the entire chain in `transactionHistory` array
4. Uses the **LATEST** transaction as the "current state"

### Frontend Validation

**File:** `pawn-web/src/app/features/transactions/renew/renew.ts`

```typescript
// Check if this transaction has been superseded by newer transactions
const transactionHistory = result.data.transactionHistory || [];
const currentTransactionNumber = result.data.ticketNumber;

if (transactionHistory.length > 0) {
  // Sort by creation date to get the latest transaction
  const sortedHistory = [...transactionHistory].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const latestTransaction = sortedHistory[0];  // Most recent
  const isLatestTransaction = latestTransaction.transactionNumber === currentTransactionNumber;
  
  if (!isLatestTransaction) {
    // ❌ This is an OLD transaction - it's "closed" (superseded)
    showError(`This transaction has been superseded. Use: ${latestTransaction.transactionNumber}`);
    return;
  }
}
```

**What this does:**
1. Gets the `transactionHistory` array from API response
2. Sorts by `createdAt` timestamp (newest first)
3. Compares the searched transaction with the latest transaction
4. If they DON'T match → Transaction is **superseded/closed**

### Example Database State

```sql
-- transactions table
tracking_number         | transaction_number     | created_at           | status
------------------------|------------------------|----------------------|--------
TXN-202510-000014       | TXN-202510-000014      | 2025-10-03 10:30:00  | active
TXN-202510-000014       | TXN-202510-000017      | 2025-10-08 12:45:00  | active ← LATEST
```

**Both rows have the SAME `tracking_number`** = They're in the same chain!

When you search `TXN-202510-000014`:
- Backend finds 2 transactions with tracking number `TXN-202510-000014`
- Returns both in `transactionHistory` array
- Frontend sees searched transaction (`000014`) ≠ latest transaction (`000017`)
- Result: **CLOSED/SUPERSEDED** ❌

---

## Method 2: Transaction Status ✅ (Backend + Frontend)

### Status Field Values

The `transactions.status` column can have these values:
- `active` ✅ - Loan is active, can be processed
- `matured` ⚠️ - Loan is past maturity date, but within grace period
- `redeemed` ❌ - Customer redeemed the loan (FINAL - cannot process)
- `defaulted` ❌ - Loan defaulted (cannot process)
- `expired` ❌ - Loan expired (past expiry date)

### Backend Validation

**File:** `pawn-api/routes/transactions.js` (Lines 43-50)

```javascript
const ticketStatus = ticketQuery.rows[0].status;

// Check if ticket can be processed
if (!['active', 'matured'].includes(ticketStatus)) {
  return res.status(400).json({
    success: false,
    message: `Ticket ${ticketNumber} is ${ticketStatus} and cannot be processed`
  });
}
```

**What this does:**
- Checks the `status` field from database
- Only allows `active` or `matured` transactions
- Blocks `redeemed`, `defaulted`, `expired` transactions

### Frontend Validation

**File:** `pawn-web/src/app/features/transactions/renew/renew.ts`

```typescript
// Check if transaction status allows renewal
const status = (result.data.status || '').toLowerCase();

if (status === 'redeemed') {
  showError('Transaction Closed', 'This transaction has been redeemed and cannot be renewed');
  return;
}

if (status === 'defaulted') {
  showError('Transaction Defaulted', 'This transaction has been defaulted and cannot be renewed');
  return;
}
```

**What this does:**
- Double-checks the status on frontend
- Shows user-friendly error messages
- Prevents form from loading for closed transactions

---

## Complete Flow: How System Knows Transaction is Closed

### Scenario: User searches `TXN-202510-000014` (which has been renewed)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User enters TXN-202510-000014                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Frontend sends GET /api/transactions/search/...     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Backend queries database                            │
│   SELECT * FROM transactions WHERE transaction_number = ... │
│   → Finds: tracking_number = 'TXN-202510-000014'            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Backend gets ALL transactions in chain              │
│   SELECT * FROM transactions                                 │
│   WHERE tracking_number = 'TXN-202510-000014'               │
│   ORDER BY created_at ASC                                    │
│                                                              │
│   Results:                                                   │
│   1. TXN-202510-000014 (created: 2025-10-03)                │
│   2. TXN-202510-000017 (created: 2025-10-08) ← LATEST       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Backend returns LATEST transaction as main data     │
│   + Full transactionHistory array                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Frontend receives response                           │
│   data.ticketNumber = "TXN-202510-000014"                   │
│   data.transactionHistory = [                                │
│     { transactionNumber: "TXN-202510-000014", ... },        │
│     { transactionNumber: "TXN-202510-000017", ... }         │
│   ]                                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Frontend sorts history by createdAt                 │
│   Latest = TXN-202510-000017                                 │
│   Searched = TXN-202510-000014                               │
│   Latest ≠ Searched → SUPERSEDED! ❌                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Show error message                                   │
│   "Transaction Superseded. Please search for:                │
│    TXN-202510-000017"                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Database Fields

### `transactions.tracking_number`
- **Purpose:** Links all related transactions together
- **Example:** All transactions in a loan's lifecycle share the same tracking number
- **Usage:** Query all transactions with same tracking_number to get full chain

### `transactions.previous_transaction_number`
- **Purpose:** Points to the immediate predecessor
- **Example:** Renewal points back to original loan
- **Usage:** Trace backward through the chain

### `transactions.created_at`
- **Purpose:** Timestamp when transaction was created
- **Usage:** Sort to find the LATEST (most recent) transaction in chain

### `transactions.status`
- **Purpose:** Current state of the transaction
- **Values:** active, matured, redeemed, defaulted, expired
- **Usage:** Direct validation if transaction can be processed

---

## Why This Matters

### Without Validation:
```
User searches: TXN-202510-000014 (old loan)
System loads: Old data from original loan
User renews: Creates DUPLICATE chain! 💥
Result: Data corruption, confusion
```

### With Validation:
```
User searches: TXN-202510-000014 (old loan)
System checks: Is this the latest? NO ❌
System blocks: Shows error with correct transaction
User searches: TXN-202510-000017 (latest)
System checks: Is this the latest? YES ✅
User renews: Creates proper chain extension 🎯
```

---

## Summary

**The system knows a transaction is "closed" by:**

1. **Checking Transaction History**
   - Gets all transactions with same `tracking_number`
   - Sorts by `created_at` timestamp
   - If searched transaction ≠ latest transaction → CLOSED

2. **Checking Status Field**
   - If status = `redeemed` → CLOSED
   - If status = `defaulted` → CLOSED
   - Only `active` or `matured` allowed

3. **Two-Layer Protection**
   - Backend validates before returning data
   - Frontend validates before loading form
   - Both layers prevent processing closed transactions

**Result:** Only the LATEST, ACTIVE transaction in a chain can be processed! ✅
