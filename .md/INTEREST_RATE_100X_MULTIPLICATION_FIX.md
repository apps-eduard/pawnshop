# Interest Rate 100x Multiplication Bug Fix

## Issue Date
October 10, 2025

## Problem Description

When searching for transaction **TXN-202510-000003** in partial payment, the interest rate displayed as **300%** instead of **3%**, and the advance interest calculated as **₱15,000** instead of **₱150**.

### Root Cause

The backend API was multiplying the interest rate by 100 to "convert decimal to percentage", but the database was already storing rates as whole percentages (3, 6) instead of decimals (0.03, 0.06).

**Example:**
- Database value: `3` (meaning 3%)
- Backend multiplied: `3 × 100 = 300`
- Frontend received: `300` (displayed as 300%)
- Calculation: `₱5,000 × 300 / 100 = ₱15,000` ❌ **WRONG!**

**Expected:**
- Database value: `3` (meaning 3%)
- Backend sends: `3` (no multiplication)
- Frontend receives: `3` (displays as 3%)
- Calculation: `₱5,000 × 3 / 100 = ₱150` ✅ **CORRECT!**

## Database Schema

According to documentation, interest rates are stored as:
- Jewelry: `3` (3% monthly)
- Appliances: `6` (6% monthly)

**Column Definition:** `interest_rate DECIMAL(5,2)` or `DECIMAL(5,4)`

## Solution Implemented

### Backend Changes (transactions.js)

Removed `* 100` multiplication in 4 locations:

#### 1. Line 222 - Transaction Lookup
**Before:**
```javascript
interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display
```

**After:**
```javascript
interestRate: parseFloat(row.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
```

#### 2. Line 291 - Transaction History
**Before:**
```javascript
interestRate: parseFloat(history.interest_rate || 0) * 100, // Convert to percentage
```

**After:**
```javascript
interestRate: parseFloat(history.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
```

#### 3. Line 537 - Additional Loan Lookup
**Before:**
```javascript
interestRate: parseFloat(row.interest_rate || 0) * 100,
interest_rate: parseFloat(row.interest_rate || 0), // Raw decimal value
```

**After:**
```javascript
interestRate: parseFloat(row.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
interest_rate: parseFloat(row.interest_rate || 0), // Same value, not decimal
```

#### 4. Line 666 - Renewal Lookup
**Before:**
```javascript
interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display
```

**After:**
```javascript
interestRate: parseFloat(row.interest_rate || 0), // Already stored as percentage (3, 6, etc.)
```

### Frontend Changes

**No changes needed!** The frontend correctly divides by 100 to convert percentage to decimal for calculations.

**File:** `pawn-web/src/app/features/transactions/partial-payment/partial-payment.ts`

**Line 252-253:**
```typescript
const monthlyRate = this.partialComputation.interestRate / 100;
this.partialComputation.advanceInterest = this.partialComputation.newPrincipalLoan * monthlyRate;
```

This is correct because:
- Frontend receives: `3` (percentage)
- Converts to decimal: `3 / 100 = 0.03`
- Calculates: `₱5,000 × 0.03 = ₱150` ✅

## Calculation Flow After Fix

### Example: Jewelry with ₱5,000 new principal

1. **Database:** `interest_rate = 3`
2. **Backend API:** Returns `interestRate: 3` (no multiplication)
3. **Frontend Display:** Shows "Rate: 3%"
4. **Calculation:**
   - Monthly rate = 3 / 100 = 0.03
   - Advance interest = 5000 × 0.03 = **₱150.00** ✅

### Example: Appliances with ₱5,000 new principal

1. **Database:** `interest_rate = 6`
2. **Backend API:** Returns `interestRate: 6` (no multiplication)
3. **Frontend Display:** Shows "Rate: 6%"
4. **Calculation:**
   - Monthly rate = 6 / 100 = 0.06
   - Advance interest = 5000 × 0.06 = **₱300.00** ✅

## Testing

### Test Case 1: TXN-202510-000003
**Transaction:** Partial Payment  
**Original Principal:** ₱6,000  
**Partial Payment:** ₱1,000  
**New Principal:** ₱5,000  
**Category:** Jewelry (3% monthly)

**Expected Results:**
- Display Rate: **3%** (not 300%)
- Advance Interest: **₱150.00** (not ₱15,000.00)
- Net Payment: ₱1,000 + ₱150 + service charge

### Test Case 2: Appliances
**New Principal:** ₱10,000  
**Category:** Appliances (6% monthly)

**Expected Results:**
- Display Rate: **6%** (not 600%)
- Advance Interest: **₱600.00** (not ₱60,000.00)

## Files Modified

1. `pawn-api/routes/transactions.js`
   - Line 222: Removed `* 100`
   - Line 291: Removed `* 100`
   - Line 537: Removed `* 100` and updated comment
   - Line 666: Removed `* 100`

## Impact

### ✅ Fixed
- Partial payment advance interest calculation
- Renewal interest display and calculation
- Additional loan interest display and calculation
- Transaction history interest rate display

### ⚠️ Verify Also
- New loan interest calculation
- Redeem interest calculation
- Invoice displays for all transaction types
- Manager dashboard calculations

## Deployment Steps

1. ✅ Backend changes committed
2. ⏳ Restart API server: `cd pawn-api && npm start`
3. ⏳ Test TXN-202510-000003 partial payment
4. ⏳ Verify interest rates display correctly (3%, 6%, not 300%, 600%)
5. ⏳ Verify advance interest calculations are accurate

## Rollback Plan

If issues occur, revert by adding `* 100` back:
```javascript
interestRate: parseFloat(row.interest_rate || 0) * 100,
```

But this requires changing database values to decimals (0.03, 0.06).

## Notes

- Database stores interest rates as **whole percentages** (3, 6)
- Frontend correctly divides by 100 for calculations
- Backend should NOT multiply by 100
- This fix aligns with the actual database schema

## Related Issues

- **PARTIAL_PAYMENT_CALCULATION_IMPLEMENTATION.md** - Documents correct calculation flow
- **BUSINESS_RULES_AND_CALCULATIONS.md** - Defines interest rate format
- **DATABASE_SCHEMA_DOCUMENTATION.md** - Defines interest_rate column as DECIMAL(5,2) or DECIMAL(5,4)

## Conclusion

The bug was caused by backend over-conversion. The fix removes unnecessary multiplication, allowing the system to work correctly with integer percentage values stored in the database (3, 6 instead of 0.03, 0.06).
