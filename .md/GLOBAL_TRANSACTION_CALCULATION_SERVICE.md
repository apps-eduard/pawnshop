# Global Transaction Calculation Service

## Overview
Centralized services for calculating transaction status, duration, interest, and penalty across all transaction types in the pawnshop system.

## Services

### 1. TransactionCalculationService
**Location:** `pawn-web/src/app/core/services/transaction-calculation.service.ts`

**Purpose:** Calculate loan status and duration

### 2. PenaltyCalculatorService  
**Location:** `pawn-web/src/app/core/services/penalty-calculator.service.ts`

**Purpose:** Calculate interest and penalty with business rules

---

## PenaltyCalculatorService Methods

### calculatePenalty()
**Used by:** Redeem transactions

**Purpose:** Calculate penalty based on days overdue
- ≤ 3 days: Daily penalty = (Principal × 2%) / 30 × days
- > 3 days: Full month penalty = Principal × 2%

### calculateInterestAndPenaltyWithGracePeriod()
**Used by:** Additional Loan, Renew transactions

**Purpose:** Calculate both interest and penalty with 3-day grace period

**Grace Period Rules:**
- Days 0-3 after maturity: NO interest, NO penalty
- Day 4+: Calculate full interest and penalty

**Returns:**
```typescript
{
  interest: number;
  penalty: number;
  discount: number;
  isWithinGracePeriod: boolean;
  daysAfterMaturity: number;
}
```

---

## TransactionCalculationService

## Service Location
`pawn-web/src/app/core/services/transaction-calculation.service.ts`

## Purpose
Provides consistent calculation logic for:
- Loan Status (Premature, Matured, Expired)
- Duration (Years, Months, Days from maturity date)
- UI Styling (Badge colors, animations)

## Key Features

### 1. Status Calculation
```typescript
getLoanStatus(maturedDate: string, expiredDate: string): string
```
- **Premature**: Current date < Maturity date
- **Matured**: Maturity date ≤ Current date < Expiry date
- **Expired**: Current date ≥ Expiry date

### 2. Duration Calculation
```typescript
getDuration(maturedDate: string): DurationInfo
```
- Calculates from **maturity date** (not granted date)
- Returns `{years, months, days}`
- Shows how long past/before maturity date

### 3. UI Styling Methods
```typescript
getStatusClass(status: string): string
getDurationBadgeColors(status: string): {years, months, days}
getDurationAnimationClass(status: string): string
```

## Usage in Components

### Import the Service
```typescript
import { TransactionCalculationService } from '../../../core/services/transaction-calculation.service';

constructor(private transactionCalcService: TransactionCalculationService) {}
```

### Get Status
```typescript
getLoanStatus(): string {
  return this.transactionCalcService.getLoanStatus(
    this.transactionInfo.maturedDate,
    this.transactionInfo.expiredDate
  );
}
```

### Get Duration
```typescript
getYearsDifference(): number {
  const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
  return duration.years;
}

getMonthsDifference(): number {
  const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
  return duration.months;
}

getDaysDifference(): number {
  const duration = this.transactionCalcService.getDuration(this.transactionInfo.maturedDate);
  return duration.days;
}
```

## Components Using This Service

1. **transaction-info.component.ts** - Shared component for all transaction pages
2. **redeem.ts** - Redemption page
3. **partial-payment.ts** (if implemented)
4. **additional-loan.ts** (if implemented)
5. **renew.ts** (if implemented)

## Benefits

### ✅ Consistency
All transaction pages show the same status and duration

### ✅ Single Source of Truth
Change calculation logic in one place, reflects everywhere

### ✅ Easy Maintenance
Update business rules without touching multiple components

### ✅ Testability
Service can be unit tested independently

## Example Scenario

**Loan Details:**
- Granted Date: Sept 4, 2025
- Maturity Date: Oct 4, 2025
- Expiry Date: Feb 4, 2026
- Current Date: Oct 7, 2025

**Results:**
- Status: **Matured** (past maturity, before expiry)
- Duration: **0Y 0M 3D** (3 days past maturity)

## Duration Calculation Logic

```
Duration = Current Date - Maturity Date

Years = floor(Duration / 365.25 days)
Months = floor(Duration / 30.44 days) - (Years * 12)
Days = Duration - (Years * 365) - (Months * 30)
```

## Color Coding

### Premature (Blue)
- Years: `from-blue-500 to-blue-600`
- Months: `from-indigo-500 to-indigo-600`
- Days: `from-cyan-500 to-cyan-600`

### Matured (Yellow/Orange)
- Years: `from-yellow-500 to-yellow-600`
- Months: `from-orange-500 to-orange-600`
- Days: `from-amber-500 to-amber-600`

### Expired (Red/Pink)
- Years: `from-red-500 to-red-600`
- Months: `from-rose-500 to-rose-600`
- Days: `from-pink-500 to-pink-600`
- Animation: `animate-pulse` ⚠️

## Future Enhancements

- [ ] Add loan age calculation (from granted date)
- [ ] Add remaining days to maturity
- [ ] Add remaining days to expiry
- [ ] Add penalty calculation integration
- [ ] Add configurable date ranges per branch

## Notes

- All dates use midnight (00:00:00) for accurate day comparison
- Duration can be negative if current date is before maturity
- Service is providedIn: 'root' for singleton instance
