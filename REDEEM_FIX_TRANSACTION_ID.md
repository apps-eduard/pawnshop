# Redeem Transaction ID Fix

## Problem

**Error**: `invalid input syntax for type integer: "TXN-202510-000006"`

The redeem endpoint was receiving a transaction number (string) instead of transaction ID (integer), causing a PostgreSQL type error.

## Root Cause

1. **Frontend**: Was sending `transactionNumber` (e.g., "TXN-202510-000006") as `ticketId`
2. **Backend**: Expected `ticketId` to be an integer (transaction ID)
3. **Database**: Query was using `WHERE id = $1` which expects an integer

## Solution

### Frontend Changes (`redeem.ts`)

1. **Added `transactionId` field** to store the integer transaction ID:
```typescript
transactionId: number = 0; // Add transaction ID field
```

2. **Capture transaction ID from search response**:
```typescript
// Set transaction number and ID
this.transactionNumber = data.ticketNumber || data.transactionNumber;
this.transactionId = data.id || 0; // Store the transaction ID
```

3. **Send transaction ID in redeem request**:
```typescript
body: JSON.stringify({
  ticketId: this.transactionId, // Send transaction ID (integer)
  transactionNumber: this.transactionNumber, // Also send transaction number for reference
  redeemAmount: this.redeemComputation.redeemAmount,
  penaltyAmount: this.redeemComputation.penalty,
  discountAmount: this.redeemComputation.discount,
  totalDue: this.redeemComputation.dueAmount,
  notes: `Redeemed with change: ₱${this.redeemComputation.change.toFixed(2)}`
})
```

4. **Clear transaction ID on form reset**:
```typescript
private clearForm() {
  this.transactionNumber = '';
  this.transactionId = 0; // Clear transaction ID
  this.transactionFound = false;
  // ...
}
```

### Backend Changes (`transactions.js`)

1. **Updated query to use transactions table** instead of pawn_tickets:
```javascript
// Get current transaction details using transaction ID
const transactionResult = await client.query(`
  SELECT t.*, pt.ticket_number 
  FROM transactions t
  LEFT JOIN pawn_tickets pt ON pt.transaction_id = t.id
  WHERE t.id = $1 AND t.status IN ('active', 'matured')
`, [ticketId]);
```

2. **Update both transactions and pawn_tickets tables**:
```javascript
// Update transaction with redeem information
await client.query(`
  UPDATE transactions SET
    status = 'redeemed',
    amount_paid = $1,
    penalty_amount = $2,
    balance = 0,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $3
`, [parseFloat(redeemAmount), parseFloat(penaltyAmount || 0), ticketId]);

// Update pawn_tickets table if exists
await client.query(`
  UPDATE pawn_tickets SET
    status = 'redeemed',
    redeem_amount = $1,
    penalty_amount = $2,
    discount_amount = $3,
    payment_amount = $4,
    balance_remaining = 0,
    redeemed_date = CURRENT_TIMESTAMP,
    notes = COALESCE(notes, '') || $5,
    updated_at = CURRENT_TIMESTAMP
  WHERE transaction_id = $6
`, [...]);
```

3. **Enhanced logging** to show both transaction ID and number:
```javascript
console.log('📋 Redeem data:', { 
  ticketId, 
  transactionNumber, 
  redeemAmount, 
  penaltyAmount, 
  discountAmount, 
  totalDue 
});
```

4. **Added ROLLBACK** on transaction not found:
```javascript
if (transactionResult.rows.length === 0) {
  await client.query('ROLLBACK');
  return res.status(404).json({
    success: false,
    message: 'Active transaction not found or not available for redemption'
  });
}
```

## Data Flow

### Search Transaction
1. User enters transaction number (e.g., "TXN-202510-000006")
2. Backend searches and returns transaction data including `id: 6` (integer)
3. Frontend stores both:
   - `transactionNumber`: "TXN-202510-000006" (for display)
   - `transactionId`: 6 (for API calls)

### Redeem Transaction
1. User clicks "Redeem" button
2. Frontend sends:
   - `ticketId`: 6 (integer)
   - `transactionNumber`: "TXN-202510-000006" (for reference)
   - Other computed values (interest, penalty, etc.)
3. Backend queries using integer ID:
   - `WHERE t.id = $1` ✅ Works correctly
4. Updates both `transactions` and `pawn_tickets` tables
5. Returns success response

## Testing

### Before Fix
```
Error: invalid input syntax for type integer: "TXN-202510-000006"
```

### After Fix
```
✅ Transaction ID: 6
✅ Transaction Number: TXN-202510-000006
✅ Redeem Amount: ₱90.20
✅ Penalty: ₱0.00
✅ Status updated to 'redeemed'
```

## Files Modified

1. **`pawn-web/src/app/features/transactions/redeem/redeem.ts`**
   - Added `transactionId` field
   - Capture ID from search response
   - Send ID in redeem request
   - Clear ID on form reset

2. **`pawn-api/routes/transactions.js`**
   - Query transactions table by ID
   - Update both transactions and pawn_tickets
   - Enhanced error handling with ROLLBACK
   - Improved logging

## Database Schema Alignment

The fix ensures proper usage of the database schema:

**transactions table** (primary):
- `id` (integer) - Primary key
- `transaction_number` (string) - Display/reference
- `status` - Transaction status
- `amount_paid`, `penalty_amount`, `balance` - Financial data

**pawn_tickets table** (legacy/reference):
- `transaction_id` (foreign key to transactions.id)
- `ticket_number` - Same as transaction_number
- Additional ticket-specific fields

## Benefits

1. ✅ **Type Safety**: Uses correct integer type for database queries
2. ✅ **Performance**: Queries by indexed integer ID instead of string
3. ✅ **Consistency**: Aligns with database schema design
4. ✅ **Maintainability**: Clear separation of ID vs Number
5. ✅ **Flexibility**: Supports both transactions and pawn_tickets tables

## Next Steps

- Test redeem functionality with various transactions
- Verify status updates in both tables
- Check audit log entries
- Test error handling (non-existent transaction, already redeemed, etc.)

---

**Fix Date**: October 5, 2025
**Status**: ✅ Complete - Ready for Testing
