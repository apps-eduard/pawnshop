# Transaction Date Service

## Overview
Centralized service for calculating new transaction dates across all transaction types. Ensures consistent date calculation logic for Additional Loan, Partial Payment, Renew, and Redeem transactions.

## Service Location
`pawn-web/src/app/core/services/transaction-date.service.ts`

---

## Purpose

Before this service, each transaction component had its own date calculation logic:
- ❌ Duplicate code across 4 components
- ❌ Inconsistent date calculation
- ❌ Hard to maintain and update

After implementing this service:
- ✅ Single source of truth for date calculations
- ✅ Consistent dates across all transactions
- ✅ Easy to modify business rules in one place

---

## Key Methods

### 1. `calculateAdditionalLoanDates()`
**Used by:** Additional Loan transactions

**Returns:** New dates based on today + 30 days maturity

```typescript
const newDates = this.transactionDateService.calculateAdditionalLoanDates();
// Returns: {
//   newMaturityDate: '2025-11-07',
//   newGracePeriodDate: '2025-11-10',
//   newExpiryDate: '2026-02-05'
// }
```

---

### 2. `calculatePartialPaymentDates()`
**Used by:** Partial Payment transactions

**Returns:** New dates based on today + 30 days maturity

```typescript
const newDates = this.transactionDateService.calculatePartialPaymentDates();
```

---

### 3. `calculateRenewDates(extensionMonths?)`
**Used by:** Renew transactions

**Parameters:**
- `extensionMonths` (optional): Number of months to extend (default: 1)

**Returns:** New dates with flexible extension period

```typescript
// 1 month extension (30 days)
const newDates = this.transactionDateService.calculateRenewDates(1);

// 4 months extension (120 days)
const newDates = this.transactionDateService.calculateRenewDates(4);
```

---

### 4. `calculateDatesFromMaturity(originalMaturityDate, extensionDays)`
**Used by:** When extending from existing maturity date instead of today

**Parameters:**
- `originalMaturityDate`: Original maturity date
- `extensionDays`: Days to extend from original maturity

```typescript
const originalMaturity = new Date('2025-10-04');
const newDates = this.transactionDateService.calculateDatesFromMaturity(originalMaturity, 30);
```

---

### 5. `calculateNewDates(baseDate, maturityDays, gracePeriodDays, expiryDaysFromMaturity)`
**Core method:** All other methods use this internally

**Parameters:**
- `baseDate`: Starting date for calculation (default: today)
- `maturityDays`: Days until maturity (default: 30)
- `gracePeriodDays`: Grace period days (default: 3)
- `expiryDaysFromMaturity`: Days from maturity to expiry (default: 90)

```typescript
// Custom calculation
const newDates = this.transactionDateService.calculateNewDates(
  new Date('2025-10-08'),  // Base date
  45,                       // 45 days maturity
  5,                        // 5 days grace period
  120                       // 120 days to expiry
);
```

---

## Utility Methods

### `getDaysBetween(startDate, endDate)`
Calculate days between two dates

```typescript
const days = this.transactionDateService.getDaysBetween(
  new Date('2025-09-04'),
  new Date('2025-10-08')
); // Returns: 34
```

### `isWithinGracePeriod(currentDate, maturityDate, gracePeriodDays?)`
Check if current date is within grace period

```typescript
const isWithinGrace = this.transactionDateService.isWithinGracePeriod(
  new Date('2025-10-06'),  // Current date
  new Date('2025-10-04'),  // Maturity date
  3                         // Grace period days
); // Returns: true (2 days after maturity)
```

### `addDays(date, days)`
Add days to a date and return formatted string (YYYY-MM-DD)

```typescript
const newDate = this.transactionDateService.addDays(new Date('2025-10-08'), 30);
// Returns: '2025-11-07'
```

### `addMonths(date, months)`
Add months to a date and return formatted string

```typescript
const newDate = this.transactionDateService.addMonths(new Date('2025-10-08'), 4);
// Returns: '2026-02-08'
```

---

## Business Rules

### Standard Date Calculation
- **Maturity Date**: Base date + 30 days
- **Grace Period Date**: Maturity date + 3 days
- **Expiry Date**: Maturity date + 90 days

### Example Timeline
```
Today:           2025-10-08
Maturity:        2025-11-07  (Today + 30 days)
Grace Period:    2025-11-10  (Maturity + 3 days)
Expiry:          2026-02-05  (Maturity + 90 days)

Grace Period Range: 2025-11-07 to 2025-11-10 (Days 0-3)
- Day 0: Nov 7  - No interest, no penalty
- Day 1: Nov 8  - No interest, no penalty
- Day 2: Nov 9  - No interest, no penalty
- Day 3: Nov 10 - No interest, no penalty
- Day 4: Nov 11 - Interest and penalty apply
```

---

## Usage in Components

### Additional Loan
```typescript
import { TransactionDateService } from '../../../core/services/transaction-date.service';

export class AdditionalLoan {
  constructor(private transactionDateService: TransactionDateService) {}

  calculateNewDates() {
    if (this.additionalComputation.additionalAmount > 0) {
      const newDates = this.transactionDateService.calculateAdditionalLoanDates();
      
      this.transactionInfo.newMaturityDate = newDates.newMaturityDate;
      this.transactionInfo.newGracePeriodDate = newDates.newGracePeriodDate;
      this.transactionInfo.newExpiryDate = newDates.newExpiryDate;
    }
  }
}
```

### Partial Payment
```typescript
calculateNewDates() {
  if (this.partialComputation.partialPay > 0) {
    const newDates = this.transactionDateService.calculatePartialPaymentDates();
    
    this.transactionInfo.newMaturityDate = newDates.newMaturityDate;
    this.transactionInfo.newGracePeriodDate = newDates.newGracePeriodDate;
    this.transactionInfo.newExpiryDate = newDates.newExpiryDate;
  }
}
```

### Renew
```typescript
calculateNewDates() {
  // Standard 1-month renewal
  const newDates = this.transactionDateService.calculateRenewDates(1);
  
  // Or extend from original maturity
  // const newDates = this.transactionDateService.calculateDatesFromMaturity(
  //   new Date(this.transactionInfo.maturedDate),
  //   30
  // );
  
  this.transactionInfo.newMaturityDate = newDates.newMaturityDate;
  this.transactionInfo.newGracePeriodDate = newDates.newGracePeriodDate;
  this.transactionInfo.newExpiryDate = newDates.newExpiryDate;
}
```

---

## Benefits

### ✅ Consistency
- All transactions use the same date calculation logic
- No discrepancies between transaction types
- Predictable date behavior

### ✅ Maintainability
- Change date calculation rules in ONE place
- No need to update multiple components
- Easier to test and validate

### ✅ Flexibility
- Support for different extension periods
- Can extend from today or from existing maturity
- Configurable grace periods and expiry dates

### ✅ Reusability
- Utility methods for common date operations
- Can be used anywhere in the application
- Type-safe with TypeScript interfaces

---

## Testing Scenarios

### Scenario 1: Standard Additional Loan
```typescript
// Given: Today is 2025-10-08
// When: Calculate additional loan dates
const dates = service.calculateAdditionalLoanDates();

// Then: Expect
expect(dates.newMaturityDate).toBe('2025-11-07');      // +30 days
expect(dates.newGracePeriodDate).toBe('2025-11-10');   // +33 days
expect(dates.newExpiryDate).toBe('2026-02-05');        // +120 days
```

### Scenario 2: Renew with 4-month Extension
```typescript
// Given: Today is 2025-10-08
// When: Calculate renew dates with 4 months
const dates = service.calculateRenewDates(4);

// Then: Expect
expect(dates.newMaturityDate).toBe('2025-12-07');      // +120 days (4 months)
expect(dates.newGracePeriodDate).toBe('2025-12-10');   // +123 days
expect(dates.newExpiryDate).toBe('2026-03-07');        // +210 days
```

### Scenario 3: Grace Period Check
```typescript
// Given: Maturity on Oct 4, Current on Oct 6
// When: Check if within grace period
const isWithinGrace = service.isWithinGracePeriod(
  new Date('2025-10-06'),
  new Date('2025-10-04'),
  3
);

// Then: Expect true (2 days after maturity, within 3-day grace)
expect(isWithinGrace).toBe(true);
```

---

## Integration with Backend

When sending transaction data to backend, include the calculated dates:

```typescript
const payload = {
  originalTicketId: this.transactionId,
  additionalAmount: this.additionalComputation.additionalAmount,
  newMaturityDate: this.transactionInfo.newMaturityDate,     // From service
  newExpiryDate: this.transactionInfo.newExpiryDate,         // From service
  notes: 'Additional loan processed'
};

await fetch('/api/transactions/additional-loan', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

---

## Future Enhancements

### Potential Additions:
1. **Holiday Awareness**: Skip weekends/holidays when calculating dates
2. **Custom Business Rules**: Different date rules per branch or region
3. **Date History**: Track all date changes for audit purposes
4. **Validation**: Ensure dates don't conflict with existing transactions

---

**Last Updated:** October 2025  
**Status:** ✅ Active  
**Used By:** Additional Loan, Partial Payment, Renew, Redeem  
**Dependencies:** None (standalone service)
