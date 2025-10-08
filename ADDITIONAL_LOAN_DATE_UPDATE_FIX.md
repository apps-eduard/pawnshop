# Additional Loan Date Update Fix

## Problem

When processing an additional loan transaction, the new dates (maturity date, expiry date) were not being reflected when searching for the ticket again.

### Scenario:
1. Search for TXN-202510-000003
2. Process additional loan with ₱500
3. System calculates new dates:
   - New Maturity: Today + 30 days
   - New Grace Period: New Maturity + 3 days
   - New Expiry: New Maturity + 90 days
4. Additional loan processed successfully
5. Search for TXN-202510-000003 again
6. **❌ PROBLEM:** Shows OLD dates instead of NEW dates

## Root Cause

### Backend Structure:
When an additional loan is processed:
1. Creates a **new child transaction** record with:
   - `transaction_type = 'additional_loan'`
   - `parent_transaction_id` = original transaction ID
   - NEW `maturity_date`, `grace_period_date`, `expiry_date`
   - NEW `principal_amount` (original + additional)
   
2. Updates the **parent transaction** with:
   - New `principal_amount`
   - New `balance`

### The Bug:
The `/search/:ticketNumber` endpoint was only returning dates from the **parent transaction** (original loan), ignoring the updated dates in the **child transaction** (additional loan).

---

## Solution

### Frontend Fix (additional-loan.ts)

**Added new date fields to the API request:**

```typescript
// Before - Missing dates
{
  originalTicketId: this.transactionId,
  additionalAmount: this.additionalComputation.additionalAmount,
  newInterestRate: this.additionalComputation.interestRate
}

// After - Includes new dates
{
  originalTicketId: this.transactionId,
  additionalAmount: this.additionalComputation.additionalAmount,
  newInterestRate: this.additionalComputation.interestRate,
  newMaturityDate: this.transactionInfo.newMaturityDate,    // ← ADDED
  newExpiryDate: this.transactionInfo.newExpiryDate,        // ← ADDED
  notes: `Additional loan of ₱${amount}`
}
```

### Backend Fix (transactions.js)

**Updated the search endpoint to return the most recent dates:**

```javascript
// Find the most recent additional loan or renewal with updated dates
const latestDateUpdate = historyResult.rows
  .filter(h => (h.transaction_type === 'additional_loan' || h.transaction_type === 'renewal') && h.status === 'active')
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

if (latestDateUpdate) {
  // Get the dates from the child transaction
  const childDatesResult = await pool.query(`
    SELECT transaction_date, granted_date, maturity_date, grace_period_date, expiry_date, principal_amount
    FROM transactions
    WHERE id = $1
  `, [latestDateUpdate.id]);
  
  if (childDatesResult.rows.length > 0) {
    const childRow = childDatesResult.rows[0];
    currentTransactionDate = formatDateForResponse(childRow.transaction_date, false);
    currentGrantedDate = formatDateForResponse(childRow.granted_date || childRow.transaction_date, false);
    currentMaturityDate = formatDateForResponse(childRow.maturity_date, true);
    currentGracePeriodDate = childRow.grace_period_date ? formatDateForResponse(childRow.grace_period_date, true) : null;
    currentExpiryDate = formatDateForResponse(childRow.expiry_date, true);
    currentPrincipal = parseFloat(childRow.principal_amount || currentPrincipal);
  }
}

// Use these current dates in the response
res.json({
  data: {
    transactionDate: currentTransactionDate,  // ← Updated
    maturityDate: currentMaturityDate,        // ← Updated
    gracePeriodDate: currentGracePeriodDate,  // ← Updated
    expiryDate: currentExpiryDate,            // ← Updated
    principalAmount: currentPrincipal,        // ← Updated
    // ... other fields
  }
});
```

---

## How It Works Now

### Date Update Flow:

1. **User searches for TXN-202510-000003**
   - Backend finds original transaction
   - Backend checks for child transactions (additional loans, renewals)
   - ✅ Returns **most recent dates** from latest child transaction

2. **User processes additional loan**
   - Frontend sends: originalTicketId, additionalAmount, **newMaturityDate**, **newExpiryDate**
   - Backend creates child transaction with new dates
   - ✅ Child transaction stores the new dates

3. **User searches for TXN-202510-000003 again**
   - Backend finds original transaction
   - Backend finds child transaction (additional loan)
   - ✅ Returns **updated dates** from the child transaction

### Date Calculation:
When entering an additional amount > 0:
- **New Maturity Date** = Today + 30 days
- **New Grace Period** = New Maturity + 3 days  
- **New Expiry Date** = New Maturity + 90 days

---

## Testing

### Test Case: Additional Loan Date Update

**Setup:**
- Transaction: TXN-202510-000003
- Original Maturity: 2025-10-04
- Current Date: 2025-10-08

**Steps:**
1. Search TXN-202510-000003 → Shows original dates
2. Enter additional amount: ₱500
3. Check new dates displayed:
   - New Maturity: 2025-11-07 (30 days from today)
   - New Grace Period: 2025-11-10 (maturity + 3)
   - New Expiry: 2026-02-05 (maturity + 90)
4. Click "Process Additional Loan"
5. Wait for success message
6. Search TXN-202510-000003 again
7. **✅ Verify:** Shows NEW dates (2025-11-07, 2025-11-10, 2026-02-05)
8. **✅ Verify:** Principal amount updated (old + ₱500)

---

## Impact

### Before Fix:
❌ Dates never updated after additional loan  
❌ Interest calculated on wrong maturity date  
❌ Penalty calculated on wrong grace period  
❌ Confusing for cashiers and customers  

### After Fix:
✅ Dates update correctly after additional loan  
✅ Interest calculated on current maturity date  
✅ Penalty calculated on current grace period  
✅ Accurate transaction information  
✅ Works for multiple additional loans  

---

## Related Transactions

This fix applies to:
- ✅ **Additional Loan** - Updates maturity and expiry dates
- ✅ **Renewal** - Updates maturity and expiry dates (same logic)
- ⚠️ **Partial Payment** - Does NOT change dates (partial payments extend but don't reset dates)
- ⚠️ **Redeem** - Closes the ticket (dates no longer relevant)

---

## Files Modified

### Frontend:
- `pawn-web/src/app/features/transactions/additional-loan/additional-loan.ts`
  - Added `newMaturityDate` and `newExpiryDate` to API request body
  - Added success toast message

### Backend:
- `pawn-api/routes/transactions.js`
  - Updated `/search/:ticketNumber` endpoint
  - Added logic to find most recent child transaction dates
  - Returns current dates instead of original dates

---

**Date:** October 2025  
**Status:** ✅ Complete  
**Priority:** High (affects transaction accuracy)
