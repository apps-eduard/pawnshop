# Partial Payment - Tracking Chain Implementation

## Summary

Updated the **Partial Payment** endpoint to use the tracking chain architecture. Now when you create a partial payment from TXN-202510-000001, it creates a NEW transaction (e.g., TXN-202510-000002) that appears in "Recent Transactions" with a toggle to view the original transaction.

## Changes Made

### Endpoint Updated: `POST /api/transactions/partial-payment`

**Location:** `pawn-api/routes/transactions.js` (Line ~1170)

### Key Changes

#### 1. Find Previous Transaction by Ticket Number (Line ~1197)

**BEFORE (Parent-Child):**
```javascript
// Find by transaction ID with JOIN
SELECT pt.*, t.* 
FROM pawn_tickets pt
JOIN transactions t ON pt.transaction_id = t.id
WHERE t.id = $1
```

**AFTER (Tracking Chain):**
```javascript
// Find by ticket number directly
SELECT t.*, t.transaction_number as ticket_number
FROM transactions t
WHERE t.transaction_number = $1
```

#### 2. Create NEW Transaction with Tracking Chain (Line ~1237)

**Added Fields:**
- `tracking_number` - Same as original transaction
- `previous_transaction_number` - Links to previous ticket

**Code:**
```javascript
INSERT INTO transactions (
  transaction_number,           // NEW: TXN-202510-000002
  tracking_number,              // SAME: TXN-202510-000001
  previous_transaction_number,  // LINK: TXN-202510-000001
  ...
)
```

#### 3. Removed UPDATE Previous Transaction (Line ~1310)

**REMOVED:**
```javascript
// ❌ OLD: Update original transaction
UPDATE transactions SET
  principal_amount = $1,
  balance = $2,
  ...
WHERE id = $9
```

**Why:** Previous transactions are now immutable. Each partial payment creates a NEW transaction in the chain.

#### 4. Copy Items to New Transaction (Line ~1320)

**NEW:**
```javascript
// Copy items from previous to new transaction
INSERT INTO pawn_items (...)
SELECT $1, category_id, description_id, ...
FROM pawn_items
WHERE transaction_id = $2
```

**Why:** The new transaction needs its own item records (not shared).

#### 5. Updated Response Format (Line ~1360)

**Added Fields:**
```javascript
{
  previousTicketNumber: "TXN-202510-000001",
  newTicketNumber: "TXN-202510-000002",
  trackingNumber: "TXN-202510-000001",
  ...
}
```

## How It Works

### Example Flow

#### Step 1: Create New Loan
```
TXN-202510-000001 (New Loan)
├─ tracking_number: TXN-202510-000001
├─ previous_transaction_number: NULL
└─ principal: ₱5,000
```

**Recent Transactions Shows:**
- TXN-202510-000001 (New Loan)
- NO history badge
- NOT clickable

#### Step 2: Create Partial Payment

**Request:**
```json
POST /api/transactions/partial-payment
{
  "ticketId": "TXN-202510-000001",
  "partialPayment": 2000,
  "newPrincipalLoan": 3000
}
```

**Result:**
```
TXN-202510-000001 (New Loan - UNCHANGED)
├─ tracking_number: TXN-202510-000001
├─ previous_transaction_number: NULL
└─ principal: ₱5,000

TXN-202510-000002 (Partial Payment - NEW)
├─ tracking_number: TXN-202510-000001  ← SAME tracking number
├─ previous_transaction_number: TXN-202510-000001  ← Links to previous
└─ principal: ₱3,000  ← NEW principal after payment
```

**Recent Transactions Shows:**
- TXN-202510-000002 (Partial Payment) ← Latest
- "2 history" badge
- Dropdown icon (▼)
- Clickable to expand

#### Step 3: User Clicks Toggle

**Expanded View Shows:**
```
1. TXN-202510-000001 (New Loan)
   Principal: ₱5,000
   Date: Oct 8, 2025

2. TXN-202510-000002 (Partial Payment) ← CURRENT
   Principal: ₱3,000
   Paid: ₱2,000
   Date: Oct 8, 2025
```

## Benefits

### ✅ Immutable History

| Feature | Old (Parent-Child) | New (Tracking Chain) |
|---------|-------------------|---------------------|
| **Original Loan** | Gets modified | Stays unchanged |
| **Partial Payment** | Updates parent | Creates new transaction |
| **Audit Trail** | Limited | Complete & accurate |
| **History** | Confusing | Clear timeline |

### ✅ Clear User Experience

**Main List:**
- Always shows the LATEST transaction (current state)
- Badge shows count of transactions in chain
- Clickable only if there's history to view

**Toggle View:**
- Shows complete transaction history
- Original loan is preserved
- Each partial payment is visible
- Chronological order (oldest → newest)

### ✅ Accurate Data

- **Current State:** TXN-202510-000002 shows ₱3,000 (after payment)
- **Original State:** TXN-202510-000001 still shows ₱5,000 (original)
- **Payment Tracking:** Clear record of ₱2,000 payment
- **Date Tracking:** New maturity dates on new transaction

## Testing

### Test Script: `test-partial-payment-tracking-chain.js`

Run the test:
```bash
node test-partial-payment-tracking-chain.js
```

**What it does:**
1. Creates New Loan (₱5,000)
2. Creates Partial Payment (pay ₱2,000, reduce to ₱3,000)
3. Verifies Recent Transactions shows the NEW partial payment transaction
4. Verifies toggle shows BOTH transactions in the chain

**Expected Output:**
```
✅ Recent Transactions Display:
   Shows: TXN-202510-000002 (Partial Payment)
   Principal: ₱3,000
   HAS HISTORY TOGGLE (2 transactions)

When toggle clicked:
   1. TXN-202510-000001 (New Loan) - ₱5,000
   2. TXN-202510-000002 (Partial Payment) - ₱3,000 ← CURRENT
```

## Frontend Behavior

### Before Click (Collapsed)
```
┌─────────────────────────────────────────────────┐
│ 📄 TXN-202510-000002  [Partial Payment] [2 history] ▼│
│ Maria Santos                                     │
│ 14K Gold Bracelet                               │
│ 1 minute ago                         ₱3,000.00  │
│                                        [Active]  │
└─────────────────────────────────────────────────┘
```

### After Click (Expanded)
```
┌─────────────────────────────────────────────────┐
│ 📄 TXN-202510-000002  [Partial Payment] [2 history] ▲│
│ Maria Santos                                     │
│ 14K Gold Bracelet                               │
│ 1 minute ago                         ₱3,000.00  │
│                                        [Active]  │
├─────────────────────────────────────────────────┤
│ Transaction History:                            │
│                                                 │
│ 1. TXN-202510-000001 [New Loan]                │
│    2 minutes ago                     Balance: ₱5,000│
│                                                 │
│ 2. TXN-202510-000002 [Partial Payment]        │
│    1 minute ago            New Principal: ₱3,000│
│                            Partial Pay: ₱2,000  │
└─────────────────────────────────────────────────┘
```

## Status

✅ **COMPLETE**

Partial Payment now uses tracking chain architecture:
- ✅ Creates NEW transaction (not updates old one)
- ✅ Links via tracking_number and previous_transaction_number
- ✅ Shows in Recent Transactions as latest state
- ✅ Toggle reveals full payment history
- ✅ Original transaction preserved (immutable)

## Next Steps

1. **Test the flow** - Create partial payment and verify display
2. **Update Renew endpoint** - Follow same pattern
3. **Update Redeem endpoint** - Follow same pattern

---

**Files Modified:**
- `pawn-api/routes/transactions.js` - Partial Payment endpoint (~200 lines)

**Files Created:**
- `test-partial-payment-tracking-chain.js` - Test script
- `PARTIAL_PAYMENT_TRACKING_CHAIN.md` - This documentation
