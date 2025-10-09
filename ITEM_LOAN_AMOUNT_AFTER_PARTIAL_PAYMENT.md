# Item loan_amount After Partial Payment - Explanation

## 🎯 Your Question
**Scenario:**
1. **1st Transaction (New Loan):**
   - `appraised_value` = ₱15,000
   - `loan_amount` = ₱10,000
   
2. **2nd Transaction (Partial Payment):**
   - `partial_paid` = ₱5,000
   
3. **Then the loan expires**

**Question:** What will the `loan_amount` value be in the `pawn_items` table?

---

## ✅ Answer: loan_amount Remains **₱10,000** (UNCHANGED)

### Why?
The `loan_amount` in the `pawn_items` table represents the **ORIGINAL loan amount per item**, NOT the current principal balance.

---

## 🔍 How the System Works

### Database Structure

#### `pawn_items` Table (Item Details)
```sql
pawn_items
├─ id
├─ transaction_id              -- Links to current transaction
├─ appraised_value             -- ₱15,000 (NEVER changes)
├─ loan_amount                 -- ₱10,000 (NEVER changes) ✅
└─ status                      -- 'in_vault', 'redeemed', etc.
```

#### `transactions` Table (Financial State)
```sql
transactions
├─ id
├─ transaction_number
├─ tracking_number             -- Links transaction chain
├─ previous_transaction_number -- Links to previous transaction
├─ transaction_type            -- 'new_loan', 'partial_payment', etc.
├─ principal_amount            -- CHANGES with partial payment ✅
├─ balance                     -- CHANGES with partial payment ✅
└─ status
```

---

## 📊 Complete Example Walkthrough

### Initial State: New Loan Transaction

**Transaction 1: TXN-001 (New Loan)**
```javascript
transactions table:
{
  transaction_number: 'TXN-001',
  tracking_number: 'TXN-001',
  previous_transaction_number: null,
  transaction_type: 'new_loan',
  principal_amount: 10000,        // ← Initial loan
  balance: 10600,                 // With interest/charges
  status: 'active'
}

pawn_items table:
{
  id: 1,
  transaction_id: (TXN-001's id),
  appraised_value: 15000,         // ✅ Original appraisal
  loan_amount: 10000,             // ✅ Original loan per item
  status: 'in_vault'
}
```

---

### After Partial Payment: New Transaction Created

**Transaction 2: TXN-002 (Partial Payment - ₱5,000)**

**What Happens:**
1. ✅ NEW transaction created (TXN-002)
2. ✅ Items COPIED from TXN-001 to TXN-002
3. ✅ Item values remain UNCHANGED (loan_amount still ₱10,000)
4. ✅ Only TRANSACTION.principal_amount changes to ₱5,000

**Backend Code (Line ~1382-1391):**
```javascript
// Copy items from previous transaction to new transaction
await client.query(`
  INSERT INTO pawn_items (
    transaction_id, category_id, description_id,
    appraisal_notes, appraised_value, loan_amount, status
  )
  SELECT 
    $1,                         -- NEW transaction_id (TXN-002)
    category_id, 
    description_id,
    appraisal_notes, 
    appraised_value,            -- ₱15,000 (copied as-is) ✅
    loan_amount,                -- ₱10,000 (copied as-is) ✅
    status
  FROM pawn_items
  WHERE transaction_id = $2     -- OLD transaction_id (TXN-001)
`, [newTransactionId, previousTransaction.id]);
```

**Result:**
```javascript
transactions table (NEW row):
{
  transaction_number: 'TXN-002',
  tracking_number: 'TXN-001',         // SAME tracking number
  previous_transaction_number: 'TXN-001',
  transaction_type: 'partial_payment',
  principal_amount: 5000,             // ✅ REDUCED (10,000 - 5,000)
  balance: 5300,                      // ✅ New balance with charges
  amount_paid: 5000,                  // ✅ Payment recorded
  new_principal_loan: 5000,           // ✅ New principal stored
  status: 'active'
}

pawn_items table (NEW row):
{
  id: 2,                              // NEW item row
  transaction_id: (TXN-002's id),     // Links to NEW transaction
  appraised_value: 15000,             // ✅ SAME (copied)
  loan_amount: 10000,                 // ✅ SAME (copied) - NOT updated!
  status: 'in_vault'                  // ✅ SAME (copied)
}

pawn_items table (OLD row - unchanged):
{
  id: 1,                              // Original item row
  transaction_id: (TXN-001's id),     // Links to OLD transaction
  appraised_value: 15000,
  loan_amount: 10000,                 // ✅ Still 10,000
  status: 'in_vault'
}
```

---

### After Expiration: Auctioneer Dashboard Query

**When the loan expires, the auctioneer dashboard shows:**

**API Query (pawn-api/routes/items.js - Line ~66-95):**
```sql
SELECT 
  pi.id, 
  pi.custom_description,
  pi.appraised_value,
  pi.loan_amount,              -- ✅ This is still ₱10,000
  pi.auction_price,
  pi.status,
  t.transaction_number as ticket_number,
  t.expiry_date as expired_date,
  p.first_name, 
  p.last_name,
  c.name as category
FROM pawn_items pi
LEFT JOIN transactions t ON pi.transaction_id = t.id
LEFT JOIN pawners p ON t.pawner_id = p.id
LEFT JOIN categories c ON pi.category_id = c.id
WHERE t.expiry_date < CURRENT_DATE
  AND pi.status = 'in_vault'
  AND t.status IN ('active', 'expired')
ORDER BY t.expiry_date DESC
```

**Result in Auctioneer Dashboard:**
```
┌─────────────────────────────────────────────────────────┐
│ Expired Item Display                                    │
├─────────────────────────────────────────────────────────┤
│ Item ID:           2                                    │
│ Ticket Number:     TXN-002                              │
│ Appraised Value:   ₱15,000.00  ← Original appraisal    │
│ Loan Amount:       ₱10,000.00  ← ORIGINAL loan amount  │
│ Status:            Expired                              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ **IMPORTANT: loan_amount vs principal_amount**

### Two Different Values Serve Different Purposes:

| Field | Location | Value | Purpose | Changes? |
|-------|----------|-------|---------|----------|
| **`loan_amount`** | `pawn_items` table | ₱10,000 | **Original loan per item** | ❌ NEVER |
| **`principal_amount`** | `transactions` table | ₱5,000 | **Current principal balance** | ✅ YES |

### Why Keep loan_amount Unchanged?

1. **Historical Record** - Shows original loan value for audit/compliance
2. **Appraisal Reference** - Links to original appraisal decision
3. **Item Identity** - Each item's original loan amount is part of its identity
4. **Multi-Item Transactions** - Each item has its own original loan amount

---

## 📈 Current Balance vs Item Loan Amount

### To Get Current Balance:
```sql
-- Query the LATEST transaction in the chain
SELECT principal_amount, balance
FROM transactions
WHERE tracking_number = 'TXN-001'
  AND status = 'active'
ORDER BY transaction_date DESC
LIMIT 1;
```

**Result:**
```
principal_amount: ₱5,000    ← Current loan balance
balance: ₱5,300             ← With interest/charges
```

### To Get Original Item Loan:
```sql
-- Query the pawn_items table
SELECT loan_amount
FROM pawn_items
WHERE id = 2;
```

**Result:**
```
loan_amount: ₱10,000        ← Original loan amount
```

---

## 🎯 Summary

### Your Scenario Results:

**1st Transaction (New Loan):**
- `pawn_items.appraised_value` = ₱15,000 ✅
- `pawn_items.loan_amount` = ₱10,000 ✅
- `transactions.principal_amount` = ₱10,000 ✅

**2nd Transaction (Partial Payment - ₱5,000):**
- `pawn_items.appraised_value` = ₱15,000 ✅ (copied, unchanged)
- `pawn_items.loan_amount` = ₱10,000 ✅ (copied, unchanged)
- `transactions.principal_amount` = ₱5,000 ✅ (REDUCED)
- `transactions.new_principal_loan` = ₱5,000 ✅ (recorded)
- `transactions.amount_paid` = ₱5,000 ✅ (recorded)

**When Expired (Auctioneer Dashboard):**
- Displays: `loan_amount` = **₱10,000** ✅
- Current Principal: ₱5,000 (stored in `transactions.principal_amount`)

---

## 💡 If You Want to Show Current Balance in Auctioneer Dashboard

### Current Display (Line ~95-105 in items.js):
```javascript
const expiredItems = result.rows.map(row => ({
  id: row.id,
  ticketNumber: row.ticket_number,
  itemDescription: row.custom_description || 'N/A',
  appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : 0,
  loanAmount: row.loan_amount ? parseFloat(row.loan_amount) : 0,  // ← Shows ORIGINAL
  // ...
}));
```

### To Show Current Balance Instead:
```javascript
// Modify query to join with transaction data
SELECT 
  pi.id, 
  pi.custom_description,
  pi.appraised_value,
  pi.loan_amount as original_loan_amount,    -- Original
  t.principal_amount as current_principal,    -- Current balance ✅
  t.balance as current_balance,               -- With charges
  // ...
FROM pawn_items pi
LEFT JOIN transactions t ON pi.transaction_id = t.id
// ...
```

Then map it:
```javascript
const expiredItems = result.rows.map(row => ({
  id: row.id,
  ticketNumber: row.ticket_number,
  itemDescription: row.custom_description || 'N/A',
  appraisedValue: row.appraised_value ? parseFloat(row.appraised_value) : 0,
  originalLoanAmount: row.original_loan_amount ? parseFloat(row.original_loan_amount) : 0,
  currentPrincipal: row.current_principal ? parseFloat(row.current_principal) : 0,  // ✅ Show this
  currentBalance: row.current_balance ? parseFloat(row.current_balance) : 0,
  // ...
}));
```

---

## 🔑 Key Takeaways

1. ✅ **`pawn_items.loan_amount`** = ORIGINAL loan amount (NEVER changes)
2. ✅ **`transactions.principal_amount`** = CURRENT loan balance (changes with partial payments)
3. ✅ Items are COPIED to new transactions with values UNCHANGED
4. ✅ To see current balance, check the LATEST transaction in the chain
5. ✅ Auctioneer dashboard currently shows ORIGINAL loan_amount (₱10,000)
6. ⚠️ If you want CURRENT balance, modify the query and display logic

---

**Created:** October 9, 2025  
**Status:** Complete Explanation ✅
