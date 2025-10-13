# Tracking Number Chain Architecture - Implementation Guide

## Overview

We've migrated from a **Parent-Child Transaction Model** to a **Tracking Number Chain Model** for better transaction management and clearer date handling.

---

## Architecture Comparison

### OLD: Parent-Child Model ❌

```
Parent Transaction (TXN-100) - Gets modified repeatedly
├─ principal_amount: 5000 → 6000 → 6500 (keeps changing)
├─ maturity_date: Oct 4 → Nov 7 → Dec 10 (keeps changing)
├─ status: active (always active)
│
├─ Child: Additional Loan (TXN-101)
│   └─ parent_transaction_id: TXN-100
│
├─ Child: Partial Payment (TXN-102)
│   └─ parent_transaction_id: TXN-100
│
└─ Child: Renew (TXN-103)
    └─ parent_transaction_id: TXN-100

Problems:
❌ Parent transaction constantly modified
❌ Confusing date updates
❌ Hard to track original state
❌ Complex queries with JOIN parent_transaction_id
```

### NEW: Tracking Number Chain ✅

```
New Loan (TXN-100)
├─ ticket_number: TXN-100
├─ tracking_number: TXN-100
├─ previous_transaction_number: NULL
├─ principal_amount: 5000
├─ maturity_date: Oct 4, 2025
└─ status: active

↓

Additional Loan (TXN-101)
├─ ticket_number: TXN-101 (NEW ticket)
├─ tracking_number: TXN-100 (links to original)
├─ previous_transaction_number: TXN-100
├─ principal_amount: 6000 (5000 + 1000)
├─ maturity_date: Nov 7, 2025 (new 30 days)
└─ status: active

↓

Partial Payment (TXN-102)
├─ ticket_number: TXN-102 (NEW ticket)
├─ tracking_number: TXN-100 (links to original)
├─ previous_transaction_number: TXN-101
├─ principal_amount: 5500 (6000 - 500 paid)
├─ maturity_date: Dec 7, 2025 (new 30 days)
└─ status: active

↓

Renew (TXN-103)
├─ ticket_number: TXN-103 (NEW ticket)
├─ tracking_number: TXN-100 (links to original)
├─ previous_transaction_number: TXN-102
├─ principal_amount: 5500 (same as previous)
├─ maturity_date: Jan 7, 2026 (extended 30 days)
└─ status: active

↓

Redeem (TXN-104)
├─ ticket_number: TXN-104 (NEW ticket)
├─ tracking_number: TXN-100 (links to original)
├─ previous_transaction_number: TXN-103
├─ principal_amount: 5500
├─ status: redeemed
└─ CLOSES the loan

Benefits:
✅ Each transaction is immutable
✅ Clear history chain
✅ Simple query: WHERE tracking_number = 'TXN-100'
✅ Easy to see progression
✅ Current state = latest transaction
```

---

## Database Schema Changes

### New Columns Added to `transactions` Table

```sql
-- Tracking Number Chain Architecture
tracking_number VARCHAR(50),                  -- Original ticket that links all transactions
previous_transaction_number VARCHAR(50),      -- Previous transaction in the chain
grace_period_date DATE,                       -- Grace period end date (maturity + 3 days)

-- Indexes for performance
CREATE INDEX idx_transactions_tracking_number ON transactions(tracking_number);
CREATE INDEX idx_transactions_previous_transaction ON transactions(previous_transaction_number);
```

### Field Definitions

| Field | Description | Example |
|-------|-------------|---------|
| `transaction_number` | Unique ticket number for THIS transaction | TXN-101 |
| `tracking_number` | Original new loan ticket number (shared by all related transactions) | TXN-100 |
| `previous_transaction_number` | Ticket number of the previous transaction in the chain | TXN-100 |
| `parent_transaction_id` | *(DEPRECATED)* Old parent-child reference | NULL |

---

## Transaction Flow Examples

### Example 1: New Loan

```sql
INSERT INTO transactions (
  transaction_number,
  tracking_number,              -- Same as transaction_number for new loans
  previous_transaction_number,  -- NULL (first in chain)
  transaction_type,
  principal_amount,
  maturity_date,
  grace_period_date,
  expiry_date,
  status
) VALUES (
  'TXN-100',
  'TXN-100',                   -- Tracking number = own ticket number
  NULL,                         -- No previous transaction
  'new_loan',
  5000.00,
  '2025-10-04',
  '2025-10-07',
  '2026-01-02',
  'active'
);
```

**Result:**
- User gets ticket: TXN-100
- This is the "tracking number" for all future transactions

---

### Example 2: Additional Loan

**User Action:** Customer with ticket TXN-100 wants additional ₱1,000

```sql
INSERT INTO transactions (
  transaction_number,
  tracking_number,              -- Same tracking number as original
  previous_transaction_number,  -- Previous ticket in chain
  transaction_type,
  principal_amount,
  maturity_date,
  grace_period_date,
  expiry_date,
  status
) VALUES (
  'TXN-101',                    -- NEW ticket number
  'TXN-100',                    -- Original tracking number
  'TXN-100',                    -- Previous transaction
  'additional_loan',
  6000.00,                      -- 5000 + 1000
  '2025-11-07',                 -- New maturity (today + 30)
  '2025-11-10',                 -- New grace period (maturity + 3)
  '2026-02-05',                 -- New expiry (maturity + 90)
  'active'
);
```

**Result:**
- User gets NEW ticket: TXN-101
- But it's still linked to original: TXN-100
- Chain: TXN-100 → TXN-101

---

### Example 3: Partial Payment

**User Action:** Customer with ticket TXN-101 pays ₱500

```sql
INSERT INTO transactions (
  transaction_number,
  tracking_number,
  previous_transaction_number,
  transaction_type,
  principal_amount,           -- Reduced by payment
  new_principal_loan,         -- Track the reduction
  maturity_date,
  grace_period_date,
  expiry_date,
  status
) VALUES (
  'TXN-102',                  -- NEW ticket
  'TXN-100',                  -- Original tracking number
  'TXN-101',                  -- Previous was additional loan
  'partial_payment',
  5500.00,                    -- 6000 - 500
  5500.00,
  '2025-12-07',               -- New maturity (today + 30)
  '2025-12-10',               -- New grace period
  '2026-03-07',               -- New expiry
  'active'
);
```

**Result:**
- User gets NEW ticket: TXN-102
- Chain: TXN-100 → TXN-101 → TXN-102

---

### Example 4: Renew

**User Action:** Customer with ticket TXN-102 wants to renew for 1 month

```sql
INSERT INTO transactions (
  transaction_number,
  tracking_number,
  previous_transaction_number,
  transaction_type,
  principal_amount,           -- Same as previous
  maturity_date,
  grace_period_date,
  expiry_date,
  status
) VALUES (
  'TXN-103',                  -- NEW ticket
  'TXN-100',                  -- Original tracking number
  'TXN-102',                  -- Previous was partial payment
  'renewal',
  5500.00,                    -- Same principal
  '2026-01-07',               -- Extended 30 days
  '2026-01-10',               -- New grace period
  '2026-04-07',               -- New expiry
  'active'
);
```

**Result:**
- User gets NEW ticket: TXN-103
- Chain: TXN-100 → TXN-101 → TXN-102 → TXN-103

---

### Example 5: Redeem

**User Action:** Customer with ticket TXN-103 wants to redeem (close loan)

```sql
INSERT INTO transactions (
  transaction_number,
  tracking_number,
  previous_transaction_number,
  transaction_type,
  principal_amount,
  status                      -- REDEEMED (closes the chain)
) VALUES (
  'TXN-104',                  -- NEW ticket (redemption receipt)
  'TXN-100',                  -- Original tracking number
  'TXN-103',                  -- Previous was renewal
  'redemption',
  5500.00,
  'redeemed'                  -- CHAIN CLOSED
);
```

**Result:**
- User gets redemption receipt: TXN-104
- Chain: TXN-100 → TXN-101 → TXN-102 → TXN-103 → TXN-104 (CLOSED)

---

## Query Examples

### Get Complete Transaction History

```sql
SELECT 
  transaction_number,
  transaction_type,
  principal_amount,
  maturity_date,
  expiry_date,
  status,
  created_at
FROM transactions
WHERE tracking_number = 'TXN-100'
ORDER BY created_at ASC;
```

**Result:**
```
ticket_number | type            | principal | maturity    | status
--------------+-----------------+-----------+-------------+----------
TXN-100       | new_loan        | 5000.00   | 2025-10-04  | active
TXN-101       | additional_loan | 6000.00   | 2025-11-07  | active
TXN-102       | partial_payment | 5500.00   | 2025-12-07  | active
TXN-103       | renewal         | 5500.00   | 2026-01-07  | active
TXN-104       | redemption      | 5500.00   | NULL        | redeemed
```

---

### Get Current Active Transaction

```sql
SELECT *
FROM transactions
WHERE tracking_number = 'TXN-100'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 1;
```

**Returns:** Most recent active transaction (TXN-103 before redemption)

---

### Get Latest Transaction (Including Redeemed)

```sql
SELECT *
FROM transactions
WHERE tracking_number = 'TXN-100'
ORDER BY created_at DESC
LIMIT 1;
```

**Returns:** TXN-104 (redemption record)

---

### Search by Any Ticket in Chain

```sql
-- User searches with TXN-102 (a partial payment ticket)
SELECT tracking_number
FROM transactions
WHERE transaction_number = 'TXN-102';
-- Returns: tracking_number = 'TXN-100'

-- Then get all history
SELECT *
FROM transactions
WHERE tracking_number = 'TXN-100'
ORDER BY created_at ASC;
```

**Result:** Returns ENTIRE history even if user only has partial payment ticket

---

## API Changes

### Search Endpoint

**Old Approach:**
```javascript
// Search by transaction_number, return single transaction
// If child transaction, JOIN parent to get history
```

**New Approach:**
```javascript
// 1. Search by transaction_number
// 2. Get tracking_number from that transaction
// 3. Return all transactions with that tracking_number
// 4. Latest transaction = current state
```

---

### Additional Loan Endpoint

**Old Approach:**
```javascript
// 1. Find parent transaction
// 2. Create child transaction with parent_transaction_id
// 3. UPDATE parent transaction (principal, dates, etc.)
```

**New Approach:**
```javascript
// 1. Find previous transaction by ticket number
// 2. Get tracking_number from previous transaction
// 3. Create NEW transaction with:
//    - New ticket_number
//    - Same tracking_number
//    - previous_transaction_number = previous ticket
// 4. Do NOT modify previous transaction (immutable)
```

---

## Benefits of New Architecture

### 1. Immutable Transactions ✅
- Each transaction record never changes
- Perfect audit trail
- Can see exact state at any point in time

### 2. Clear History ✅
```sql
-- Simple query to see entire loan lifecycle
WHERE tracking_number = 'TXN-100'
```

### 3. Flexible Searching ✅
- User can provide ANY ticket in the chain
- System finds all related transactions
- No confusion about parent vs child

### 4. Accurate Dates ✅
- Each transaction has its own dates
- No overwriting old dates
- Easy to see when dates changed

### 5. Better Status Management ✅
- Only the LATEST transaction matters
- Old transactions don't need status updates
- Clear loan lifecycle tracking

### 6. Simplified Queries ✅
```sql
-- No more complex JOINS
-- No more parent_transaction_id recursive queries
-- Just: WHERE tracking_number = ?
```

---

## Migration Strategy

### Phase 1: Database ✅
- [x] Add tracking_number column
- [x] Add previous_transaction_number column
- [x] Add grace_period_date column
- [x] Add indexes
- [x] Update schema creation script

### Phase 2: Backend API (In Progress)
- [ ] Update search endpoint to use tracking_number
- [ ] Update additional loan endpoint
- [ ] Update partial payment endpoint
- [ ] Update renew endpoint
- [ ] Update redeem endpoint
- [ ] Stop using parent_transaction_id

### Phase 3: Frontend (Pending)
- [ ] Update search to show full history
- [ ] Display chain of transactions
- [ ] Show previous ticket numbers
- [ ] Handle multiple tickets per loan

### Phase 4: Testing
- [ ] Test new loan creation
- [ ] Test additional loan with tracking
- [ ] Test partial payment with tracking
- [ ] Test renewal with tracking
- [ ] Test redemption closes chain
- [ ] Test searching with old tickets
- [ ] Test searching with new tickets

---

## Backward Compatibility

For existing data migration (if you have old data):

```sql
-- For parent transactions, set tracking_number = own transaction_number
UPDATE transactions 
SET tracking_number = transaction_number 
WHERE parent_transaction_id IS NULL 
  AND tracking_number IS NULL;

-- For child transactions, set tracking_number = parent's transaction_number
UPDATE transactions t1
SET tracking_number = (
  SELECT t2.transaction_number 
  FROM transactions t2 
  WHERE t2.id = t1.parent_transaction_id
)
WHERE t1.parent_transaction_id IS NOT NULL 
  AND t1.tracking_number IS NULL;

-- Set previous_transaction_number for child transactions
UPDATE transactions t1
SET previous_transaction_number = (
  SELECT t2.transaction_number 
  FROM transactions t2 
  WHERE t2.id = t1.parent_transaction_id
)
WHERE t1.parent_transaction_id IS NOT NULL 
  AND t1.previous_transaction_number IS NULL;
```

---

**Status:** Database schema updated ✅  
**Next Step:** Update backend API endpoints  
**Timeline:** Implementation in progress
