# Additional Loan Calculation Implementation

## Overview
Successfully implemented interest, penalty, and service charge calculations for the Additional Loan transaction feature.

## Changes Made

### 1. **Import PenaltyCalculatorService**
```typescript
import { PenaltyCalculatorService } from '../../../core/services/penalty-calculator.service';
```

### 2. **Added Transaction ID Field**
```typescript
transactionId: number = 0;
```
Stores the integer transaction ID for API calls.

### 3. **Injected PenaltyCalculatorService**
```typescript
constructor(
  private router: Router,
  private location: Location,
  private toastService: ToastService,
  private penaltyCalculatorService: PenaltyCalculatorService
) {}
```

### 4. **Enhanced Calculation Logic**

#### Interest Calculation
```typescript
// Calculate interest on existing loan (from grant date to now)
const loanDate = new Date(this.transactionInfo.grantedDate);
const currentDate = new Date();
const loanPeriodDays = Math.ceil((currentDate.getTime() - loanDate.getTime()) / (1000 * 3600 * 24));
const monthlyRate = this.additionalComputation.interestRate / 100;
const dailyRate = monthlyRate / 30;
this.additionalComputation.interest = this.additionalComputation.previousLoan * dailyRate * loanPeriodDays;
```

**Formula**: `Interest = Previous Loan × (Monthly Rate / 30) × Days Since Grant Date`

#### Penalty Calculation
```typescript
// Calculate penalty using PenaltyCalculatorService
const maturityDate = new Date(this.transactionInfo.maturedDate);
const currentDate = new Date();
const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
  this.additionalComputation.previousLoan,
  maturityDate,
  currentDate
);
this.additionalComputation.penalty = penaltyDetails.penaltyAmount;
```

**Penalty Rules**:
- **0 days overdue**: No penalty
- **1-3 days overdue**: `(principal × 0.02) / 30 × days`
- **4+ days overdue**: `principal × 0.02` (full month)

#### Available Amount Calculation
```typescript
const totalObligation = this.additionalComputation.previousLoan + 
                       this.additionalComputation.interest + 
                       this.additionalComputation.penalty;
this.additionalComputation.availableAmount =
  (this.additionalComputation.appraisalValue * 0.5) - totalObligation;
```

**Formula**: `Available = (Appraisal × 50%) - (Previous Loan + Interest + Penalty)`

#### Additional Amount
```typescript
this.additionalComputation.additionalAmount =
  Math.max(0, this.additionalComputation.availableAmount - this.additionalComputation.discount);
```

**Formula**: `Additional = max(0, Available - Discount)`

#### New Principal Loan
```typescript
this.additionalComputation.newPrincipalLoan =
  this.additionalComputation.previousLoan + this.additionalComputation.additionalAmount;
```

**Formula**: `New Principal = Previous Loan + Additional Amount`

#### Advance Interest
```typescript
this.additionalComputation.advanceInterest =
  (this.additionalComputation.newPrincipalLoan * this.additionalComputation.interestRate) / 100;
```

**Formula**: `Advance Interest = New Principal × Interest Rate (1 month advance)`

#### Service Charge (Dynamic)
```typescript
async calculateServiceCharge() {
  const response = await fetch('http://localhost:3000/api/service-charge-config/calculate', {
    method: 'POST',
    body: JSON.stringify({
      principalAmount: this.additionalComputation.newPrincipalLoan
    })
  });
  // With fallback brackets if API fails
}
```

**Fallback Brackets**:
- ≤ ₱500: ₱10
- ≤ ₱1,000: ₱15
- ≤ ₱5,000: ₱20
- ≤ ₱10,000: ₱30
- ≤ ₱20,000: ₱40
- > ₱20,000: ₱50

#### Net Proceed
```typescript
this.additionalComputation.netProceed =
  this.additionalComputation.additionalAmount -
  this.additionalComputation.advanceInterest -
  this.additionalComputation.advServiceCharge -
  this.additionalComputation.interest -
  this.additionalComputation.penalty;
```

**Formula**: `Net Proceed = Additional - Advance Interest - Service Charge - Interest - Penalty`

This is what the customer actually receives.

#### Redeem Amount
```typescript
this.additionalComputation.redeemAmount =
  this.additionalComputation.newPrincipalLoan +
  this.additionalComputation.advanceInterest +
  this.additionalComputation.advServiceCharge;
```

**Formula**: `Redeem Amount = New Principal + Advance Interest + Service Charge`

This is what the customer needs to pay to redeem.

### 5. **API Integration**

Implemented `processAdditionalLoan()` with:
- Transaction ID validation
- API call to `/api/transactions/additional`
- Success/error handling
- Automatic redirect to dashboard after 1.5 seconds

```typescript
body: JSON.stringify({
  transactionId: this.transactionId,
  transactionNumber: this.transactionNumber,
  additionalAmount: this.additionalComputation.additionalAmount,
  interest: this.additionalComputation.interest,
  penalty: this.additionalComputation.penalty,
  newPrincipalLoan: this.additionalComputation.newPrincipalLoan,
  advanceInterest: this.additionalComputation.advanceInterest,
  serviceCharge: this.additionalComputation.advServiceCharge,
  netProceed: this.additionalComputation.netProceed,
  discount: this.additionalComputation.discount
})
```

## Calculation Flow

1. **Search Transaction** → Load existing loan data
2. **Auto-Calculate on Load**:
   - Calculate interest on existing loan (from grant date to now)
   - Calculate penalty if past maturity (using PenaltyCalculatorService)
   - Calculate available amount (50% of appraisal minus total obligation)
   - Calculate additional amount (available minus discount)
   - Calculate new principal loan
   - Calculate advance interest (1 month on new principal)
   - Fetch service charge dynamically from API
   - Calculate net proceed (what customer receives)
   - Calculate redeem amount (what customer pays later)

3. **User Adjusts Discount** → Recalculates everything automatically

4. **Process Additional Loan** → Save to backend and redirect to dashboard

## Example Calculation

### Scenario: Jewelry, ₱20,000 previous loan, 45 days old, 5 days past maturity

**Given**:
- Previous Loan: ₱20,000
- Interest Rate: 3% monthly
- Days since grant: 45
- Days overdue: 5
- Appraisal Value: ₱50,000
- Discount: ₱500

**Step 1: Interest** (45 days at 3%)
```
Interest = ₱20,000 × (0.03 / 30) × 45 = ₱900
```

**Step 2: Penalty** (5 days overdue = full month)
```
Penalty = ₱20,000 × 0.02 = ₱400
```

**Step 3: Total Obligation**
```
Total = ₱20,000 + ₱900 + ₱400 = ₱21,300
```

**Step 4: Available Amount**
```
Available = (₱50,000 × 0.5) - ₱21,300 = ₱3,700
```

**Step 5: Additional Amount**
```
Additional = ₱3,700 - ₱500 (discount) = ₱3,200
```

**Step 6: New Principal**
```
New Principal = ₱20,000 + ₱3,200 = ₱23,200
```

**Step 7: Advance Interest** (1 month on new principal)
```
Advance Interest = ₱23,200 × 0.03 = ₱696
```

**Step 8: Service Charge** (₱23,200 principal)
```
Service Charge = ₱50 (from API/fallback)
```

**Step 9: Net Proceed** (what customer receives)
```
Net = ₱3,200 - ₱696 - ₱50 - ₱900 - ₱400 = ₱1,154
```

**Step 10: Redeem Amount** (future obligation)
```
Redeem = ₱23,200 + ₱696 + ₱50 = ₱23,946
```

## User Experience

1. ✅ **Search** transaction
2. ✅ **View** auto-calculated amounts
3. ✅ **Adjust** discount (optional)
4. ✅ **See** real-time recalculation
5. ✅ **Review** net proceed amount
6. ✅ **Process** additional loan
7. ✅ **Auto-redirect** to dashboard

## Testing Recommendations

### Test Case 1: Premature Loan (No Penalty)
- Previous loan not yet matured
- Should calculate interest only
- Penalty = ₱0

### Test Case 2: Matured Loan (1-3 Days Overdue)
- 2 days past maturity
- Should calculate daily penalty
- Penalty = (principal × 0.02 / 30) × 2

### Test Case 3: Expired Loan (4+ Days Overdue)
- 10 days past maturity
- Should calculate full month penalty
- Penalty = principal × 0.02

### Test Case 4: With Discount
- Enter discount amount
- Verify: Additional Amount reduces
- Verify: Net Proceed adjusts

### Test Case 5: Service Charge Brackets
- Test various principal amounts
- Verify correct service charge applied

## Files Modified

**`additional-loan.ts`**:
- Imported PenaltyCalculatorService
- Added transactionId field
- Implemented comprehensive calculateAdditionalLoan() method
- Added calculateServiceCharge() with API integration
- Added calculateFallbackServiceCharge() for fallback
- Implemented processAdditionalLoan() with API call
- Added dashboard redirect after success
- Enhanced logging for debugging

## Backend Compatibility

Expected backend endpoint: `POST /api/transactions/additional`

**Request Body**:
```json
{
  "transactionId": 5,
  "transactionNumber": "TXN-202510-000005",
  "additionalAmount": 3200,
  "interest": 900,
  "penalty": 400,
  "newPrincipalLoan": 23200,
  "advanceInterest": 696,
  "serviceCharge": 50,
  "netProceed": 1154,
  "discount": 500
}
```

**Response**:
```json
{
  "success": true,
  "message": "Additional loan processed successfully",
  "data": { ... }
}
```

## Next Steps

1. Backend implementation of `/api/transactions/additional` endpoint
2. Test with various loan scenarios
3. Verify calculations match business rules
4. Test API integration
5. Test dashboard redirect

---

**Implementation Date**: October 5, 2025
**Status**: ✅ Complete - Ready for Backend Integration
