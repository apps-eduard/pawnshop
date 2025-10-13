# Tracking Chain Validation for Renew

## Problem Statement

**Scenario:**
- Original New Loan: `TXN-202510-000014` (active)
- Renewal Transaction: `TXN-202510-000017` (current state)

**Issue:** 
When searching for `TXN-202510-000014`, the system allowed renewal of the OLD transaction, creating confusion and potential data integrity issues.

**Solution:**
Validate that only the LATEST transaction in a tracking chain can be renewed.

---

## Implementation

### Validation Logic

When a user searches for a transaction to renew, the system now:

1. **Checks Transaction History** - Examines all transactions in the tracking chain
2. **Identifies Latest Transaction** - Sorts by `createdAt` timestamp to find most recent
3. **Compares Current vs Latest** - Prevents action if searched transaction is not the latest
4. **Validates Status** - Ensures transaction status allows renewal (not redeemed/defaulted)

### Code Changes

**File:** `pawn-web/src/app/features/transactions/renew/renew.ts`

```typescript
if (result.success && result.data) {
  // **TRACKING CHAIN VALIDATION**
  // Check if this transaction has been superseded by newer transactions
  const transactionHistory = result.data.transactionHistory || [];
  const currentTransactionNumber = result.data.ticketNumber || result.data.transactionNumber;
  
  // If there's transaction history, check if this is the latest transaction
  if (transactionHistory.length > 0) {
    // Sort by creation date to get the latest transaction
    const sortedHistory = [...transactionHistory].sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    const latestTransaction = sortedHistory[0];
    const isLatestTransaction = latestTransaction.transactionNumber === currentTransactionNumber;
    
    if (!isLatestTransaction) {
      // This is an old transaction in the chain
      this.toastService.showError(
        'Transaction Superseded', 
        `This transaction has been superseded. Please search for the latest transaction: ${latestTransaction.transactionNumber}`
      );
      this.transactionFound = false;
      this.isLoading = false;
      return;
    }
  }
  
  // Check if transaction status allows renewal
  const status = (result.data.status || '').toLowerCase();
  if (status === 'redeemed') {
    this.toastService.showError('Transaction Closed', 'This transaction has been redeemed and cannot be renewed');
    this.transactionFound = false;
    this.isLoading = false;
    return;
  }
  
  if (status === 'defaulted') {
    this.toastService.showError('Transaction Defaulted', 'This transaction has been defaulted and cannot be renewed');
    this.transactionFound = false;
    this.isLoading = false;
    return;
  }
  
  // Proceed with renewal if all validations pass
  this.populateForm(result.data);
  this.transactionFound = true;
}
```

---

## User Experience

### Before Fix:
```
User searches: TXN-202510-000014
✅ Search succeeds
✅ Form loads with old data
❌ User can renew OLD transaction (creates duplicate chain)
```

### After Fix:
```
User searches: TXN-202510-000014
✅ Search succeeds
❌ System detects superseded transaction
🚫 Shows error: "Transaction Superseded. Please search for: TXN-202510-000017"
✅ User searches correct transaction
✅ Renewal proceeds correctly
```

---

## Validation Rules

### ✅ Allowed to Renew:
- Latest transaction in the tracking chain
- Status: `active` or `matured`
- Not redeemed
- Not defaulted

### ❌ NOT Allowed to Renew:
- Old transaction with newer renewals
- Status: `redeemed`
- Status: `defaulted`
- Transaction not found

---

## Example Tracking Chain

```
Tracking Number: TXN-202510-000014

Chain History:
┌─────────────────────────────────────────────────┐
│ TXN-202510-000014 (New Loan)                    │
│ ├─ Created: 2025-10-03                          │
│ ├─ Status: active                               │
│ ├─ Principal: ₱2,700                            │
│ └─ ⚠️ SUPERSEDED - Cannot renew                 │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ TXN-202510-000017 (Renewal)                     │
│ ├─ Created: 2025-10-08                          │
│ ├─ Status: active                               │
│ ├─ Principal: ₱2,700                            │
│ └─ ✅ LATEST - Can renew                        │
└─────────────────────────────────────────────────┘
```

### What Happens:

1. **Search TXN-202510-000014:**
   - ❌ Error: "Transaction superseded, use TXN-202510-000017"
   
2. **Search TXN-202510-000017:**
   - ✅ Success: Load transaction for renewal
   - ✅ User can proceed with renewal

---

## Error Messages

### 1. Superseded Transaction
```
Title: "Transaction Superseded"
Message: "This transaction has been superseded. Please search for the latest transaction: TXN-202510-000017"
```

### 2. Redeemed Transaction
```
Title: "Transaction Closed"
Message: "This transaction has been redeemed and cannot be renewed"
```

### 3. Defaulted Transaction
```
Title: "Transaction Defaulted"
Message: "This transaction has been defaulted and cannot be renewed"
```

---

## Benefits

1. **Data Integrity** - Prevents duplicate renewals in tracking chain
2. **User Guidance** - Tells user exactly which transaction to search
3. **Status Protection** - Prevents renewal of closed/defaulted transactions
4. **Clear Feedback** - Descriptive error messages explain why action is blocked

---

## Testing Checklist

- [x] Search old transaction in chain → Shows "Superseded" error
- [x] Search latest transaction → Allows renewal
- [x] Search redeemed transaction → Shows "Closed" error
- [x] Search defaulted transaction → Shows "Defaulted" error
- [x] Error message shows correct latest transaction number
- [x] Form does not populate for invalid transactions
- [x] Focus not set to received amount for invalid transactions

---

## Related Components

This same validation should be applied to:
- ✅ **Renew** (implemented)
- ⏳ **Partial Payment** (needs same validation)
- ⏳ **Additional Loan** (needs same validation)
- ⏳ **Redeem** (needs same validation, but allows old transactions)

**Note:** Redeem might need different logic - it should allow redemption of ANY transaction in the chain since customer might want to redeem from any point.

---

## Database Schema Reference

The validation relies on:
- `transactions.tracking_number` - Links all transactions in a chain
- `transactions.previous_transaction_number` - Points to predecessor
- `transactions.created_at` - Timestamp to determine latest
- `transactions.status` - Current state of transaction
- `transactionHistory[]` - Array of all transactions in chain (from API)

---

## API Dependency

This validation depends on the `/api/transactions/search/:ticketNumber` endpoint returning:
```json
{
  "success": true,
  "data": {
    "ticketNumber": "TXN-202510-000014",
    "status": "active",
    "transactionHistory": [
      {
        "transactionNumber": "TXN-202510-000014",
        "createdAt": "2025-10-03T...",
        ...
      },
      {
        "transactionNumber": "TXN-202510-000017",
        "createdAt": "2025-10-08T...",
        ...
      }
    ],
    ...
  }
}
```

The `transactionHistory` array is critical for identifying superseded transactions.
