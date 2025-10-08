# Ticket ID Parameter Flexible Lookup Fix

## Issue

The frontend was sending numeric database IDs (e.g., `ticketId: 14`) but the backend endpoints were expecting transaction number strings (e.g., `"TXN-202510-000004"`).

### Error Seen
```
🔍 Looking for transaction with ticket number: 14
// SQL: WHERE transaction_number = '14'
// Result: Transaction not found (404 error)
```

The query was looking for a transaction with `transaction_number = '14'`, but the actual transaction number was `'TXN-202510-000004'`.

## Root Cause

After implementing the tracking chain architecture, all endpoints were updated to use `transaction_number` instead of database `id`. However, the frontend still sends the database ID in some cases.

### Affected Endpoints

1. **Partial Payment** - `POST /api/transactions/partial-payment`
2. **Redeem** - `POST /api/transactions/redeem`
3. **Additional Loan** - `POST /api/transactions/additional-loan`
4. **Renew** - `POST /api/transactions/renew`

## Solution

Added **flexible lookup** that accepts BOTH database ID (number) and transaction number (string).

### Implementation Pattern

```javascript
// BEFORE - Only transaction number
const previousTxnResult = await client.query(`
  SELECT * FROM transactions 
  WHERE transaction_number = $1
`, [ticketId]);

// AFTER - Both ID and transaction number
console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);

// Check if ticketId is a number (ID) or string (transaction number)
const isNumericId = !isNaN(ticketId);

const previousTxnResult = await client.query(`
  SELECT * FROM transactions 
  WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'}
`, [ticketId]);
```

### How It Works

1. **Check Type**: `!isNaN(ticketId)` determines if it's a number
2. **Dynamic Query**: Uses `id = $1` for numbers, `transaction_number = $1` for strings
3. **Backwards Compatible**: Works with both old (ID) and new (transaction number) frontends

### Examples

| Frontend Sends | Type | SQL Query | Result |
|----------------|------|-----------|---------|
| `ticketId: 14` | Number | `WHERE id = 14` | ✅ Finds by ID |
| `ticketId: "14"` | String (numeric) | `WHERE id = 14` | ✅ Finds by ID |
| `ticketId: "TXN-202510-000004"` | String | `WHERE transaction_number = 'TXN-202510-000004'` | ✅ Finds by txn number |

## Code Changes

### 1. Partial Payment Endpoint (Line ~1200)

**File**: `pawn-api/routes/transactions.js`

```javascript
// **TRACKING CHAIN ARCHITECTURE**
// 1. Find the previous transaction by ticket number OR ID
console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);

// Check if ticketId is a number (ID) or string (transaction number)
const isNumericId = !isNaN(ticketId);

const previousTxnResult = await client.query(`
  SELECT t.*, t.transaction_number as ticket_number
  FROM transactions t
  WHERE ${isNumericId ? 't.id = $1' : 't.transaction_number = $1'}
`, [ticketId]);
```

### 2. Redeem Endpoint (Line ~1002)

```javascript
// **TRACKING CHAIN ARCHITECTURE**
// 1. Find previous transaction by ticket number OR ID
console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);

// Check if ticketId is a number (ID) or string (transaction number)
const isNumericId = !isNaN(ticketId);

const previousTxnResult = await client.query(`
  SELECT * FROM transactions 
  WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'}
`, [ticketId]);
```

### 3. Additional Loan Endpoint (Line ~1440)

```javascript
// 1. Find previous transaction by ticket_number OR ID
console.log(`🔍 Looking for transaction with identifier: ${originalTicketId}`);

// Check if originalTicketId is a number (ID) or string (transaction number)
const isNumericId = !isNaN(originalTicketId);

const transactionResult = await client.query(`
  SELECT * FROM transactions 
  WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'} AND status = 'active'
`, [originalTicketId]);
```

### 4. Renew Endpoint (Line ~1650)

```javascript
// **TRACKING CHAIN ARCHITECTURE**
// 1. Find previous transaction by ticket number OR ID
console.log(`🔍 Looking for transaction with identifier: ${ticketId}`);

// Check if ticketId is a number (ID) or string (transaction number)
const isNumericId = !isNaN(ticketId);

const previousTxnResult = await client.query(`
  SELECT * FROM transactions 
  WHERE ${isNumericId ? 'id = $1' : 'transaction_number = $1'}
`, [ticketId]);
```

## Testing

### Test Case 1: Frontend Sends Database ID
```javascript
// Request
{
  "ticketId": 14,  // ← Database ID (number)
  "partialPayment": 700,
  "newPrincipalLoan": 2000
}

// Server Log
🔍 Looking for transaction with identifier: 14
// SQL: WHERE id = 14
✅ Found previous transaction: TXN-202510-000004
```

### Test Case 2: Frontend Sends Transaction Number
```javascript
// Request
{
  "ticketId": "TXN-202510-000004",  // ← Transaction number (string)
  "partialPayment": 700,
  "newPrincipalLoan": 2000
}

// Server Log
🔍 Looking for transaction with identifier: TXN-202510-000004
// SQL: WHERE transaction_number = 'TXN-202510-000004'
✅ Found previous transaction: TXN-202510-000004
```

### Test Case 3: Frontend Sends Numeric String
```javascript
// Request
{
  "ticketId": "14",  // ← String that looks like number
  "partialPayment": 700,
  "newPrincipalLoan": 2000
}

// Server Log
🔍 Looking for transaction with identifier: 14
// SQL: WHERE id = 14  (because !isNaN("14") === true)
✅ Found previous transaction: TXN-202510-000004
```

## Benefits

✅ **Backwards Compatible**: Works with old frontend code that sends IDs  
✅ **Future-Proof**: Works with new frontend code that sends transaction numbers  
✅ **Type Flexible**: Handles both numeric and string inputs  
✅ **No Breaking Changes**: Existing functionality continues to work  
✅ **Clear Logging**: Console shows what identifier was used  

## Frontend Recommendation

While the backend now supports both, it's recommended to **update the frontend** to send transaction numbers instead of IDs:

```typescript
// BEFORE (still works)
{
  ticketId: transaction.id  // 14
}

// BETTER (recommended)
{
  ticketId: transaction.transactionNumber  // "TXN-202510-000004"
}
```

**Why?** Transaction numbers are:
- More meaningful and readable
- Unique across branches
- Never change (IDs might change during migrations)
- Part of the tracking chain architecture

## Related Files

- `pawn-api/routes/transactions.js` - All 4 endpoints updated
- `SEQUENTIAL_TRANSACTION_NUMBERS_FIX.md` - Related fix for number generation
- `ALL_ENDPOINTS_TRACKING_CHAIN_COMPLETE.md` - Overall architecture

## Summary

✅ **Fixed**: All transaction endpoints now accept both database ID and transaction number  
✅ **No 404 Errors**: Partial payment, redeem, additional loan, and renew now work correctly  
✅ **Flexible**: Supports both numeric IDs and string transaction numbers  
✅ **Tracking Chain Compatible**: Works seamlessly with the new architecture
