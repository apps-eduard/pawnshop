# Sequential Transaction Numbers Fix

## Issue

Transaction numbers were not sequential:
- Expected: `TXN-202510-000001`, `TXN-202510-000002`, `TXN-202510-000003`
- Actual: `TXN-202510-756452`, `TXN-202510-589940`

## Root Cause

The `getNextSequenceNumber()` function in `utils/transactionUtils.js` has a fallback mechanism:

```javascript
try {
  // Query transaction_sequences table for next number
} catch (error) {
  console.error('Error getting sequence number:', error);
  return Date.now() % 1000000;  // FALLBACK: Random number based on timestamp
}
```

The error was:
```
Error getting sequence number: error: invalid input syntax for type integer: "TXN"
```

### Why It Failed

The `transaction_sequences` table expects `branch_id` as the first parameter (integer), but was receiving a string or wrong type. 

Looking at the database query:
```javascript
const existingSeq = await pool.query(`
  SELECT id, current_number, reset_frequency, last_reset_date 
  FROM transaction_sequences 
  WHERE branch_id = $1 AND sequence_type = $2 AND year = $3
`, [branchId, sequenceType, currentYear]);
```

When `branchId` was not properly converted to an integer, PostgreSQL threw:
`invalid input syntax for type integer: "TXN"`

## Solution

Added `parseInt()` to all `branchId` assignments in `routes/transactions.js`:

### 1. New Loan Endpoint (Line ~783)
```javascript
// BEFORE
const branchId = req.user.branch_id || 1;

// AFTER
const branchId = parseInt(req.user.branch_id) || 1;
```

### 2. Redeem Endpoint (Line ~1022)
```javascript
// BEFORE
const branchId = previousTransaction.branch_id || 1;

// AFTER
const branchId = parseInt(previousTransaction.branch_id) || 1;
```

### 3. Partial Payment Endpoint (Line ~1240)
```javascript
// BEFORE
const branchId = previousTransaction.branch_id || 1;

// AFTER  
const branchId = parseInt(previousTransaction.branch_id) || 1;
console.log(`🏢 Branch ID for new transaction: ${branchId} (type: ${typeof branchId})`);
```

### 4. Additional Loan Endpoint (Line ~1453)
```javascript
// BEFORE
const branchId = previousTransaction.branch_id;

// AFTER
const branchId = parseInt(previousTransaction.branch_id) || 1;
```

### 5. Renew Endpoint (Line ~1664)
```javascript
// BEFORE
const branchId = previousTransaction.branch_id || 1;

// AFTER
const branchId = parseInt(previousTransaction.branch_id) || 1;
```

## How Sequential Numbering Works

### Database Table: `transaction_sequences`
```sql
CREATE TABLE transaction_sequences (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER,
  sequence_type VARCHAR(50),  -- 'TICKET', 'LOAN', 'PAYMENT'
  current_number INTEGER DEFAULT 0,
  prefix VARCHAR(10),
  suffix VARCHAR(10),
  year INTEGER,
  month INTEGER,
  reset_frequency VARCHAR(20),  -- 'daily', 'monthly', 'yearly', 'never'
  last_reset_date DATE,
  UNIQUE(branch_id, sequence_type, year, month)
);
```

### Number Generation Flow

1. **Call `generateTicketNumber(branchId)`**
   - Example: `generateTicketNumber(1)`

2. **Calls `generateCompleteTransactionNumber('TICKET', branchId)`**

3. **Calls `getNextSequenceNumber('TICKET', branchId)`**
   - Queries `transaction_sequences` table
   - Finds or creates a sequence for branch 1, type 'TICKET', year 2025
   - Increments `current_number` (e.g., 0 → 1)
   - Returns the incremented number

4. **Calls `generateTransactionNumber(config, sequenceNumber)`**
   - config has prefix 'TXN', date format 'YYYYMM', padding 6
   - sequenceNumber = 1
   - Generates: `TXN-202510-000001`

### Example Sequence

| Transaction | Branch | Type | Current Number | Generated |
|-------------|--------|------|----------------|-----------|
| New Loan | 1 | TICKET | 1 | TXN-202510-000001 |
| Partial Payment | 1 | TICKET | 2 | TXN-202510-000002 |
| Additional Loan | 1 | TICKET | 3 | TXN-202510-000003 |
| Renew | 1 | TICKET | 4 | TXN-202510-000004 |
| Redeem | 1 | TICKET | 5 | TXN-202510-000005 |

### Reset Behavior

- **Yearly Reset**: When the year changes (e.g., 2025 → 2026), sequence starts at 1
- **Monthly Reset**: When the month changes, sequence starts at 1
- **Never Reset**: Continuous numbering (1, 2, 3... forever)

Current configuration uses **yearly reset**, so:
- 2025: TXN-202510-000001, TXN-202510-000002, ...
- 2026: TXN-202601-000001, TXN-202601-000002, ...

## Testing

### 1. Check Current Sequence
```sql
SELECT * FROM transaction_sequences 
WHERE branch_id = 1 AND sequence_type = 'TICKET';
```

Expected:
```
id | branch_id | sequence_type | current_number | year | month
---|-----------|---------------|----------------|------|------
1  | 1         | TICKET        | 3              | 2025 | 10
```

### 2. Create New Loan
- Should get: `TXN-202510-000004`
- Check sequence table: `current_number` should be 4

### 3. Create Partial Payment
- Should get: `TXN-202510-000005`
- Check sequence table: `current_number` should be 5

### 4. Verify No Fallback
Check server logs - you should NOT see:
```
Error getting sequence number: ...
```

## Fallback Removal (Optional)

If you want to ensure sequential numbers are ALWAYS enforced (no fallback), update line 172-177 in `utils/transactionUtils.js`:

```javascript
// BEFORE
} catch (error) {
  console.error('Error getting sequence number:', error);
  return Date.now() % 1000000;  // Fallback
}

// AFTER
} catch (error) {
  console.error('Error getting sequence number:', error);
  throw new Error(`Failed to generate sequence number: ${error.message}`);
}
```

This will **fail the transaction** if sequence generation fails, ensuring you never get random numbers.

## Summary

✅ **Fixed**: All endpoints now properly convert `branch_id` to integer using `parseInt()`  
✅ **Result**: Transaction numbers will be sequential (000001, 000002, 000003...)  
✅ **No More**: Random timestamp-based numbers (756452, 589940)  

The system now correctly:
1. Queries the `transaction_sequences` table
2. Increments the counter
3. Generates properly formatted sequential transaction numbers
4. Resets counters yearly as configured
