# Transaction Service Implementation Guide

## Overview

This guide explains how to implement and use the enhanced Transaction Service with penalty computation and transaction operations (Redeem, Renew, Additional, Partial).

## Penalty Computation Rules

The penalty calculation follows these business rules:

### Formula
- **Base Rate**: 2% per month (`principalLoan * 0.02`)
- **Daily Rate**: `(principalLoan * 0.02) / 30`

### Calculation Logic
- **Less than 3 days overdue**: Daily penalty calculation
  ```
  penalty = ((principalLoan * 0.02) / 30) * numberOfDays
  ```
- **4 days or more overdue**: Full month penalty
  ```
  penalty = principalLoan * 0.02
  ```

## Services Implementation

### 1. Transaction Service (Enhanced)

The `TransactionService` now includes:
- Penalty calculations
- Transaction operations (Redeem, Renew, Additional, Partial)
- Validation methods
- Utility functions

### 2. Penalty Calculator Service

A dedicated service for penalty calculations with methods:
- `calculatePenalty()` - Core penalty calculation
- `calculateRedemptionAmount()` - Total amount due calculation
- `calculatePartialPaymentApplication()` - Payment distribution logic
- `formatPenaltyDetails()` - Display formatting
- Utility methods for date calculations

## Transaction Types Implementation

### 1. REDEEM (Full Payment)

```typescript
// Example usage
const redeemRequest: RedeemRequest = {
  loanId: 'LOAN123',
  paymentAmount: 15000.00,
  paymentMethod: 'CASH',
  remarks: 'Full redemption payment'
};

this.transactionService.redeemLoan(redeemRequest).subscribe({
  next: (response) => {
    console.log('Loan redeemed successfully');
  },
  error: (error) => {
    console.error('Redemption failed:', error);
  }
});
```

### 2. RENEW (Extend Maturity)

```typescript
// Example usage
const renewRequest: RenewRequest = {
  loanId: 'LOAN123',
  newMaturityDate: new Date('2025-11-05'),
  additionalInterest: 500.00,
  serviceCharge: 100.00,
  remarks: 'Loan renewal for 30 days'
};

this.transactionService.renewLoan(renewRequest).subscribe({
  next: (response) => {
    console.log('Loan renewed successfully');
  }
});
```

### 3. ADDITIONAL (Add Loan Amount)

```typescript
// Example usage
const additionalRequest: AdditionalLoanRequest = {
  loanId: 'LOAN123',
  additionalAmount: 5000.00,
  newAppraisalValue: 25000.00,
  remarks: 'Additional loan based on new appraisal'
};

this.transactionService.addAdditionalLoan(additionalRequest).subscribe({
  next: (response) => {
    console.log('Additional loan processed');
  }
});
```

### 4. PARTIAL (Partial Payment)

```typescript
// Example usage
const partialRequest: PartialPaymentRequest = {
  loanId: 'LOAN123',
  paymentAmount: 3000.00,
  paymentMethod: 'CASH',
  remarks: 'Partial payment towards penalty and interest'
};

this.transactionService.processPartialPayment(partialRequest).subscribe({
  next: (response) => {
    console.log('Partial payment processed');
  }
});
```

## Penalty Calculation Examples

### Example 1: 2 Days Overdue
```typescript
const penalty = this.penaltyCalculator.calculatePenalty(
  10000, // Principal: ₱10,000
  new Date('2025-10-01'), // Maturity Date
  new Date('2025-10-03')  // Current Date (2 days overdue)
);

// Result:
// penalty.penaltyAmount = 13.33 (₱10,000 * 0.02 / 30 * 2)
// penalty.calculationMethod = 'daily'
// penalty.daysOverdue = 2
```

### Example 2: 5 Days Overdue
```typescript
const penalty = this.penaltyCalculator.calculatePenalty(
  10000, // Principal: ₱10,000
  new Date('2025-10-01'), // Maturity Date
  new Date('2025-10-06')  // Current Date (5 days overdue)
);

// Result:
// penalty.penaltyAmount = 200.00 (₱10,000 * 0.02)
// penalty.calculationMethod = 'monthly'
// penalty.isFullMonthPenalty = true
// penalty.daysOverdue = 5
```

## Redemption Amount Calculation

```typescript
const redemptionCalc = this.penaltyCalculator.calculateRedemptionAmount(
  10000, // Principal
  3.5,   // Interest rate (3.5%)
  new Date('2025-09-01'), // Loan date
  new Date('2025-10-01'), // Maturity date
  new Date('2025-10-05'), // Current date
  50     // Service charges
);

// Result includes:
// - principalAmount: 10000
// - interestAmount: calculated based on rate and period
// - penaltyAmount: calculated based on overdue days
// - serviceCharges: 50
// - totalAmountDue: sum of all amounts
// - breakdown: detailed breakdown of each component
```

## Partial Payment Distribution

Payments are applied in this priority order:
1. Service Charges
2. Penalty
3. Interest  
4. Principal

```typescript
const paymentApplication = this.penaltyCalculator.calculatePartialPaymentApplication(
  5000,  // Payment amount
  10000, // Principal amount
  350,   // Interest amount
  200,   // Penalty amount
  50     // Service charges
);

// Result shows how ₱5,000 is distributed:
// - appliedToServiceCharges: 50
// - appliedToPenalty: 200
// - appliedToInterest: 350
// - appliedToPrincipal: 4400
// - remainingBalance: 5550 (remaining principal)
// - fullyPaid: false
```

## API Endpoints Expected

The service expects these API endpoints to be implemented on the backend:

```
POST /api/transactions/redeem
POST /api/transactions/renew
POST /api/transactions/additional
POST /api/transactions/partial-payment
GET  /api/transactions/{loanId}/penalty
GET  /api/transactions/loan/{loanId}/with-penalty
POST /api/transactions/calculate-redemption
GET  /api/transactions/loan/{loanId}/history
POST /api/transactions/validate
```

## Integration Steps

1. **Import Services** in your component:
   ```typescript
   import { TransactionService } from './core/services/transaction.service';
   import { PenaltyCalculatorService } from './core/services/penalty-calculator.service';
   ```

2. **Inject Services** in constructor:
   ```typescript
   constructor(
     private transactionService: TransactionService,
     private penaltyCalculator: PenaltyCalculatorService
   ) {}
   ```

3. **Load Loan Details** and calculate penalties:
   ```typescript
   loadLoan(loanId: string) {
     this.transactionService.getLoanWithPenalty(loanId).subscribe(loan => {
       const penalty = this.penaltyCalculator.calculatePenalty(
         loan.principalLoan,
         loan.maturedDate
       );
       // Use penalty data in your UI
     });
   }
   ```

4. **Process Transactions** using the appropriate methods based on user selection.

## UI Considerations

- Display penalty calculation details to users
- Show payment distribution for partial payments  
- Validate transaction amounts before submission
- Provide clear confirmation dialogs for each transaction type
- Handle loading states during API calls
- Show success/error messages appropriately

## Error Handling

- Validate loan status before allowing transactions
- Check payment amounts against requirements
- Handle API errors gracefully
- Provide user-friendly error messages
- Log errors for debugging

## Testing Considerations

- Test penalty calculations with various scenarios
- Verify payment distribution logic
- Test edge cases (exact maturity date, very old loans)
- Validate API integration
- Test error handling paths

This implementation provides a comprehensive solution for pawnshop transaction processing with accurate penalty calculations according to your business rules.
