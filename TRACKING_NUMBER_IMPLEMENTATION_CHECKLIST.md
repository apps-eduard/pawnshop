# Tracking Number Chain - Implementation Checklist

## ✅ COMPLETED

### Database Schema
- [x] Added `tracking_number` column to transactions table
- [x] Added `previous_transaction_number` column to transactions table  
- [x] Added `grace_period_date` column to transactions table
- [x] Added indexes for tracking_number and previous_transaction_number
- [x] Updated main schema file: `pawn_shop_core_tables.sql`
- [x] Created migration script: `add-tracking-number-column.js`
- [x] Created comprehensive documentation: `TRACKING_NUMBER_CHAIN_ARCHITECTURE.md`

---

## 🔄 NEXT STEPS

### Backend API Updates (Priority Order)

#### 1. New Loan Endpoint (HIGHEST PRIORITY)
**File:** `pawn-api/routes/transactions.js`  
**Changes Needed:**
```javascript
// When creating new loan, set:
{
  transaction_number: generateTicketNumber(),
  tracking_number: transaction_number,     // Same as transaction_number
  previous_transaction_number: null,       // First in chain
  // ... rest of fields
}
```

#### 2. Search Endpoint
**File:** `pawn-api/routes/transactions.js`  
**Changes Needed:**
```javascript
// 1. Search by transaction_number to get tracking_number
// 2. Return ALL transactions with that tracking_number
// 3. Latest transaction = current state
```

#### 3. Additional Loan Endpoint
**File:** `pawn-api/routes/transactions.js`  
**Changes Needed:**
```javascript
// 1. Find previous transaction by ticket number
// 2. Get tracking_number from previous
// 3. Create NEW transaction:
{
  transaction_number: generateTicketNumber(),      // NEW ticket
  tracking_number: previousTransaction.tracking_number,  // SAME tracking
  previous_transaction_number: previousTransaction.transaction_number,
  // ... rest of fields
}
// 4. Do NOT update previous transaction (immutable!)
```

#### 4. Partial Payment Endpoint
**Changes:** Same pattern as Additional Loan

#### 5. Renew Endpoint  
**Changes:** Same pattern as Additional Loan

#### 6. Redeem Endpoint
**Changes:** Create new transaction with status='redeemed'

---

## 📋 DETAILED IMPLEMENTATION PLAN

### Step 1: Update New Loan
```javascript
router.post('/new-loan', async (req, res) => {
  const ticketNumber = await generateTicketNumber(branchId);
  
  await client.query(`
    INSERT INTO transactions (
      transaction_number,
      tracking_number,              -- NEW
      previous_transaction_number,  -- NEW
      transaction_type,
      principal_amount,
      maturity_date,
      grace_period_date,           -- NEW
      expiry_date,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    ticketNumber,
    ticketNumber,  // tracking_number = own ticket
    null,          // No previous transaction
    'new_loan',
    principalAmount,
    maturityDate,
    gracePeriodDate,
    expiryDate,
    'active'
  ]);
});
```

### Step 2: Update Search
```javascript
router.get('/search/:ticketNumber', async (req, res) => {
  const { ticketNumber } = req.params;
  
  // 1. Find the transaction to get tracking_number
  const transactionResult = await pool.query(`
    SELECT tracking_number 
    FROM transactions 
    WHERE transaction_number = $1
  `, [ticketNumber]);
  
  if (transactionResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }
  
  const trackingNumber = transactionResult.rows[0].tracking_number;
  
  // 2. Get ALL transactions with this tracking number
  const historyResult = await pool.query(`
    SELECT * 
    FROM transactions 
    WHERE tracking_number = $1 
    ORDER BY created_at ASC
  `, [trackingNumber]);
  
  // 3. Latest transaction = current state
  const currentTransaction = historyResult.rows[historyResult.rows.length - 1];
  
  res.json({
    success: true,
    data: {
      currentTransaction,           // Latest state
      history: historyResult.rows,  // Full chain
      trackingNumber                // Original ticket
    }
  });
});
```

### Step 3: Update Additional Loan
```javascript
router.post('/additional-loan', async (req, res) => {
  const { originalTicketNumber, additionalAmount } = req.body;
  
  // 1. Find previous transaction
  const previousTxn = await client.query(`
    SELECT * FROM transactions WHERE transaction_number = $1
  `, [originalTicketNumber]);
  
  // 2. Generate NEW ticket number
  const newTicketNumber = await generateTicketNumber(branchId);
  
  // 3. Create NEW transaction (don't modify previous!)
  await client.query(`
    INSERT INTO transactions (
      transaction_number,
      tracking_number,                              -- From previous
      previous_transaction_number,                  -- Previous ticket
      transaction_type,
      principal_amount,
      maturity_date,
      grace_period_date,
      expiry_date,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    newTicketNumber,
    previousTxn.rows[0].tracking_number,          // SAME tracking number
    previousTxn.rows[0].transaction_number,        // Previous ticket
    'additional_loan',
    newPrincipal,
    newMaturityDate,
    newGracePeriodDate,
    newExpiryDate,
    'active'
  ]);
  
  // 4. Do NOT update previous transaction!
});
```

---

## 🧪 TESTING CHECKLIST

### Test Scenario 1: New Loan → Additional → Partial → Renew → Redeem

```
1. Create new loan
   - Ticket: TXN-100
   - tracking_number: TXN-100
   - previous_transaction_number: NULL

2. Search TXN-100
   - Should return: current state + history (1 transaction)

3. Additional loan on TXN-100
   - New ticket: TXN-101
   - tracking_number: TXN-100
   - previous_transaction_number: TXN-100

4. Search TXN-100 OR TXN-101
   - Should return: current state + history (2 transactions)

5. Partial payment on TXN-101
   - New ticket: TXN-102
   - tracking_number: TXN-100
   - previous_transaction_number: TXN-101

6. Search TXN-100 OR TXN-101 OR TXN-102
   - Should return: current state + history (3 transactions)

7. Renew TXN-102
   - New ticket: TXN-103
   - tracking_number: TXN-100
   - previous_transaction_number: TXN-102

8. Redeem TXN-103
   - New ticket: TXN-104
   - tracking_number: TXN-100
   - previous_transaction_number: TXN-103
   - status: 'redeemed'

9. Search TXN-100 OR any ticket in chain
   - Should return: full history (5 transactions)
   - Latest status: 'redeemed'
```

---

## 📊 DATA VERIFICATION QUERIES

### Check Tracking Number Setup
```sql
SELECT 
  transaction_number,
  tracking_number,
  previous_transaction_number,
  transaction_type,
  principal_amount,
  status
FROM transactions
ORDER BY tracking_number, created_at;
```

### Verify Chain Integrity
```sql
SELECT 
  t1.transaction_number AS current_ticket,
  t1.tracking_number,
  t1.previous_transaction_number AS prev_ticket,
  t2.transaction_number AS verify_prev_exists
FROM transactions t1
LEFT JOIN transactions t2 
  ON t1.previous_transaction_number = t2.transaction_number
WHERE t1.previous_transaction_number IS NOT NULL;
-- All rows should have verify_prev_exists populated
```

### Find Broken Chains
```sql
SELECT *
FROM transactions
WHERE previous_transaction_number IS NOT NULL
  AND previous_transaction_number NOT IN (
    SELECT transaction_number FROM transactions
  );
-- Should return 0 rows (no broken chains)
```

---

## 🎯 IMPLEMENTATION PRIORITY

1. **NEW LOAN** - Must set tracking_number correctly
2. **SEARCH** - Must work with new architecture  
3. **ADDITIONAL LOAN** - High usage, needs update
4. **PARTIAL PAYMENT** - High usage, needs update
5. **RENEW** - Medium usage
6. **REDEEM** - Must close chain properly

---

## 🔄 ROLLBACK PLAN

If needed to revert:

```sql
-- Remove new columns
ALTER TABLE transactions DROP COLUMN tracking_number;
ALTER TABLE transactions DROP COLUMN previous_transaction_number;
ALTER TABLE transactions DROP COLUMN grace_period_date;

-- Drop indexes
DROP INDEX idx_transactions_tracking_number;
DROP INDEX idx_transactions_previous_transaction;
```

---

**Current Status:** Database ready ✅  
**Next Action:** Update New Loan endpoint  
**Timeline:** Ready to implement API changes
