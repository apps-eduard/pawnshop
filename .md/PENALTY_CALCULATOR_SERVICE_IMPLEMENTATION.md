# Penalty Calculator Service Implementation

## Summary of Changes (January 2025)

### Problem Identified
- Additional Loan and Renew transactions were using **hardcoded calculation logic**
- ~95 lines of duplicate code in each component
- Not using the centralized `PenaltyCalculatorService`
- Potential for inconsistencies between transaction types

### Solution Implemented
1. Added new method to `PenaltyCalculatorService`: `calculateInterestAndPenaltyWithGracePeriod()`
2. Updated `additional-loan.ts` to use the service
3. Updated `renew.ts` to use the service
4. Removed duplicate calculation code (~190 lines total)

---

## Service Method: calculateInterestAndPenaltyWithGracePeriod()

### Location
`pawn-web/src/app/core/services/penalty-calculator.service.ts`

### Used By
- Additional Loan transactions
- Renew transactions

### Interest Calculation Type
**MONTHLY** - Calculates interest on full months only using `floor(days/30)`

### Parameters
```typescript
calculateInterestAndPenaltyWithGracePeriod(
  principalAmount: number,
  interestRate: number,
  grantedDate: Date,
  maturityDate: Date,
  currentDate: Date = new Date()
)
```

### Returns
```typescript
{
  interest: number;           // Calculated interest amount (full months)
  penalty: number;            // Calculated penalty amount
  discount: number;           // Days discount (if within grace period)
  isWithinGracePeriod: boolean;  // true if days 0-3 after maturity
  daysAfterMaturity: number;  // Days since maturity date
}
```

---

## Service Method: calculateDailyInterestAndPenaltyWithGracePeriod()

### Location
`pawn-web/src/app/core/services/penalty-calculator.service.ts`

### Used By
- Partial Payment transactions

### Interest Calculation Type
**DAILY** - Calculates interest per day using `dailyRate × days`

### Parameters
```typescript
calculateDailyInterestAndPenaltyWithGracePeriod(
  principalAmount: number,
  interestRate: number,
  grantedDate: Date,
  maturityDate: Date,
  currentDate: Date = new Date()
)
```

### Returns
```typescript
{
  interest: number;           // Calculated interest amount (per day)
  penalty: number;            // Calculated penalty amount
  discount: number;           // Days discount (if within grace period)
  isWithinGracePeriod: boolean;  // true if days 0-3 after maturity
  daysAfterMaturity: number;  // Days since maturity date
}
```

---

## Business Logic (Both Methods)

#### Grace Period (Days 0-3 after maturity)
- **Interest:** ₱0
- **Penalty:** ₱0
- **Discount:** daysAfterMaturity (for display purposes)

#### After Grace Period (Day 4+)

**Interest Calculation (MONTHLY - Additional/Renew):**
1. Calculate total days from grant date to current date
2. Subtract 30 days (already paid in advance)
3. Calculate full months: `floor(additional days / 30)`
4. Interest = `Principal × (Rate/100) × months`

**Interest Calculation (DAILY - Partial Payment):**
1. Calculate total days from grant date to current date
2. Subtract 30 days (already paid in advance)
3. Calculate daily rate: `(Rate/100) / 30`
4. Interest = `Principal × dailyRate × additionalDays`

**Penalty Calculation (Same for all):**
1. Calculate days after grace period: `daysAfterMaturity - 3`
2. Calculate full months: `ceil(days after grace period / 30)`
3. Penalty = `Principal × 2% × months`

---

## Usage in Components

### Additional Loan Component
**File:** `pawn-web/src/app/features/transactions/additional-loan/additional-loan.ts`

**Method:** `recalculateAdditionalAmount()`

**Interest Type:** DAILY (per day)

**Before (Hardcoded - Monthly):**
```typescript
// ~95 lines of manual calculation logic
// Used MONTHLY: floor(days/30) - resulted in ₱0 for < 30 days
if (isWithinGracePeriod) {
  this.additionalComputation.interest = 0;
} else {
  const monthsOverdue = Math.floor(additionalDays / 30);
  this.additionalComputation.interest = principal * monthlyRate * monthsOverdue;
}
```

**After (Using Service - Daily):**
```typescript
const calculation = this.penaltyCalculatorService.calculateDailyInterestAndPenaltyWithGracePeriod(
  this.additionalComputation.previousLoan,
  this.additionalComputation.interestRate,
  new Date(this.transactionInfo.grantedDate),
  new Date(this.transactionInfo.maturedDate),
  new Date()
);

this.additionalComputation.interest = calculation.interest;
this.additionalComputation.penalty = calculation.penalty;
this.additionalComputation.discount = calculation.discount;
```

### Renew Component
**File:** `pawn-web/src/app/features/transactions/renew/renew.ts`

**Method:** `calculateRenewalAmount()`

**Interest Type:** DAILY (per day)

**Before (Hardcoded - Monthly):**
```typescript
// ~95 lines of manual calculation logic
// Used MONTHLY: floor(days/30) - resulted in ₱0 for < 30 days
if (isWithinGracePeriod) {
  this.renewComputation.interest = 0;
} else {
  const monthsOverdue = Math.floor(additionalDays / 30);
  this.renewComputation.interest = principal * monthlyRate * monthsOverdue;
}
```

**After (Using Service - Daily):**
```typescript
const calculation = this.penaltyCalculatorService.calculateDailyInterestAndPenaltyWithGracePeriod(
  this.renewComputation.principalLoan,
  this.renewComputation.interestRate,
  new Date(this.transactionInfo.grantedDate),
  new Date(this.transactionInfo.maturedDate),
  new Date()
);

this.renewComputation.interest = calculation.interest;
this.renewComputation.penalty = calculation.penalty;
this.renewComputation.discount = calculation.discount;
```

### Partial Payment Component
**File:** `pawn-web/src/app/features/transactions/partial-payment/partial-payment.ts`

**Method:** `calculatePartialPayment()`

**Interest Type:** DAILY (per day)

**Before (Hardcoded):**
```typescript
// ~85 lines of manual calculation logic
if (isWithinGracePeriod) {
  this.partialComputation.interest = 0;
  // ... more manual calculations
} else {
  const dailyRate = monthlyRate / 30;
  this.partialComputation.interest = principal * dailyRate * additionalDays;
  // ... complex manual logic
}
```

**After (Using Service):**
```typescript
const calculation = this.penaltyCalculatorService.calculateDailyInterestAndPenaltyWithGracePeriod(
  this.partialComputation.principalLoan,
  this.partialComputation.interestRate,
  new Date(this.transactionInfo.grantedDate),
  new Date(this.transactionInfo.maturedDate),
  new Date()
);

this.partialComputation.interest = calculation.interest;
this.partialComputation.penalty = calculation.penalty;
this.partialComputation.discount = calculation.discount;
```

### Redeem Component
**File:** `pawn-web/src/app/features/transactions/redeem/redeem.ts`

**Method:** `calculateRedeemAmount()`

**Interest Type:** DAILY (per day)

**Before (Hardcoded):**
```typescript
// ~65 lines of manual calculation logic
if (isWithinGracePeriod) {
  this.redeemComputation.interest = 0;
  // ... more manual calculations
} else {
  const dailyRate = monthlyRate / 30;
  this.redeemComputation.interest = principal * dailyRate * additionalDays;
  // ... complex manual logic including penalty
}
```

**After (Using Service):**
```typescript
const calculation = this.penaltyCalculatorService.calculateDailyInterestAndPenaltyWithGracePeriod(
  this.redeemComputation.principalLoan,
  this.redeemComputation.interestRate,
  grantDate,
  maturityDate,
  currentDate
);

this.redeemComputation.interest = calculation.interest;
this.redeemComputation.penalty = calculation.penalty;
this.redeemComputation.discount = calculation.discount;
```

---

## Service Coverage by Transaction Type

| Transaction Type | Uses Service | Method Used | Interest Type | Status |
|-----------------|--------------|-------------|---------------|---------|
| **Additional Loan** | ✅ Yes | `calculateDailyInterestAndPenaltyWithGracePeriod()` | Daily | ✅ Complete |
| **Renew** | ✅ Yes | `calculateDailyInterestAndPenaltyWithGracePeriod()` | Daily | ✅ Complete |
| **Partial Payment** | ✅ Yes | `calculateDailyInterestAndPenaltyWithGracePeriod()` | Daily | ✅ Complete |
| **Redeem** | ✅ Yes | `calculateDailyInterestAndPenaltyWithGracePeriod()` | Daily | ✅ Complete |

### 🎉 100% Service Coverage Achieved!

All transaction types now use the centralized `PenaltyCalculatorService` for both interest and penalty calculations. No hardcoded business logic remains in components.

### ⚡ Important Change (October 2025)
**All transactions now use DAILY interest calculation** for consistency and accuracy. The monthly interest method has been deprecated as it resulted in ₱0 interest for transactions with less than 30 additional days.

---

## Key Decision: ALL Transactions Use DAILY Interest

### Why DAILY Interest for All?

**Problem with Monthly Interest:**
- Transaction with 34 days active (4 days past first month)
- Monthly calculation: `floor(4/30) = 0 months` = **₱0 interest** ❌
- Customer owes money but sees ₱0 - incorrect!

**Solution with Daily Interest:**
- Same transaction: 4 additional days
- Daily calculation: `4 days × daily rate` = **₱X.XX interest** ✅
- Accurate, fair, and consistent

### Calculation Formula (All Transactions)

**Within Grace Period (Days 0-3):**
- Interest: ₱0
- Penalty: ₱0
- Discount: Days after maturity

**After Grace Period (Day 4+):**
- Interest: `Principal × (Rate/100/30) × (totalDays - 30)`
- Penalty: `Principal × 2% × ceil((daysAfterMaturity - 3) / 30)`

**Example: TXN-202510-000007**
- Principal: ₱2,700
- Rate: 6%
- Granted: 2025-09-04
- Maturity: 2025-10-04
- Current: 2025-10-08
- Total days: 34
- Additional days: 4
- **Interest:** 2700 × (6%/30) × 4 = 2700 × 0.002 × 4 = **₱21.60**
- **Penalty:** 2700 × 2% × ceil(1/30) = 2700 × 0.02 × 1 = **₱54.00**

---

## Benefits

### Code Reduction
- **Before:** ~340 lines of calculation logic (duplicated across components)
  - Additional Loan: ~95 lines
  - Renew: ~95 lines
  - Partial Payment: ~85 lines
  - Redeem: ~65 lines
- **After:** ~130 lines in service + simple calls in components
- **Savings:** ~210 lines removed + much better structure

### Consistency
- All transactions now use the same calculation method
- No risk of formula discrepancies
- Single source of truth

### Maintainability
- Change logic once, affects all transactions
- Easier to add new transaction types
- Centralized unit testing

### Accuracy
- Consistent rounding: `Math.round(value * 100) / 100`
- Proper floor/ceil usage for month calculations
- Validated date handling

---

## Testing Recommendations

### Test Cases for Grace Period
✅ Day 0 (maturity date): No interest, no penalty  
✅ Day 1: No interest, no penalty, discount = 1  
✅ Day 2: No interest, no penalty, discount = 2  
✅ Day 3: No interest, no penalty, discount = 3  
✅ Day 4: Calculate full interest and penalty  

### Test Cases for Interest Calculation
✅ Exactly 30 days: 0 months of interest  
✅ 60 days: 1 month of interest  
✅ 89 days: 1 month of interest (floor)  
✅ 90 days: 2 months of interest  

### Test Cases for Penalty Calculation
✅ 4 days after maturity: 1 day after grace = 1 month penalty (ceil)  
✅ 33 days after maturity: 30 days after grace = 1 month penalty  
✅ 34 days after maturity: 31 days after grace = 2 months penalty (ceil)  

---

## Console Logging

The service-based calculation provides clear console logs:

```
💰 Interest & Penalty Calculation (Additional Loan): {
  isWithinGracePeriod: false,
  daysAfterMaturity: 10,
  interest: 120.00,
  penalty: 40.00,
  discount: 0
}
```

This makes debugging and verification much easier than scattered console logs in components.

---

## Future Improvements

### Future Improvements

### ~~Partial Payment Migration~~ ✅ COMPLETE
~~Consider migrating partial payment to use the service~~

**Status:** ✅ Completed - Now uses `calculateDailyInterestAndPenaltyWithGracePeriod()`

### Additional Service Methods
Potential additions to the service:
- `calculateAdvanceInterest()` - For new loan advance interest
- `calculateServiceCharge()` - Tier-based service charge calculation
- `calculateNetProceed()` - Net proceed calculation with all deductions

---

## Related Documentation
- `API_CONTRACTS_REFERENCE.md` - API endpoint contracts
- `BUSINESS_RULES_AND_CALCULATIONS.md` - Complete business rules
- `GLOBAL_TRANSACTION_CALCULATION_SERVICE.md` - Original service documentation

---

**Date:** January 2025  
**Status:** ✅ Complete  
**Impact:** High (reduces duplication, improves consistency)  
**Breaking Changes:** None (same calculation results)
