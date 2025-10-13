# Partial Payment Calculation Implementation

## Overview
This document details the comprehensive partial payment calculation implementation for the pawnshop system, including interest calculation, penalty calculation using PenaltyCalculatorService, dynamic service charge via API, payment application logic, and proper balance tracking.

## Implementation Date
2025-01-XX

## Components Modified
- `pawn-web/src/app/features/transactions/partial-payment/partial-payment.ts`

## Calculation Flow

### 1. Interest Calculation
Interest is calculated from the grant date to the current date using a daily rate:

```typescript
Formula:
  Days Difference = Current Date - Grant Date (in days)
  Daily Rate = (Monthly Interest Rate / 100) / 30
  Interest Amount = Principal Loan × Daily Rate × Days Difference

Example:
  Principal Loan: ₱10,000
  Interest Rate: 5% monthly
  Days from Grant: 45 days
  
  Daily Rate = (5 / 100) / 30 = 0.00166667
  Interest = 10,000 × 0.00166667 × 45 = ₱750.00
```

### 2. Penalty Calculation
Penalty is calculated using the PenaltyCalculatorService with the following business rules:

```typescript
Rules:
  - Not yet matured (maturity date in future): No penalty
  - Within grace period (0-3 days overdue): Daily penalty = (Principal × 2% / 30) × Days
  - Beyond grace period (4+ days overdue): Full month penalty = Principal × 2%

Example 1: 2 days overdue
  Principal: ₱10,000
  Days Overdue: 2
  Penalty = (10,000 × 0.02 / 30) × 2 = ₱13.33

Example 2: 10 days overdue
  Principal: ₱10,000
  Days Overdue: 10
  Penalty = 10,000 × 0.02 = ₱200.00
```

### 3. Total Obligation
Calculate the total amount customer owes:

```typescript
Formula:
  Total Obligation = Principal Loan + Interest + Penalty - Discount

Example:
  Principal Loan: ₱10,000
  Interest: ₱750.00
  Penalty: ₱200.00
  Discount: ₱0
  
  Total Obligation = 10,000 + 750 + 200 - 0 = ₱10,950.00
```

### 4. Redeem Amount
The redeem amount is the total obligation (amount needed to fully redeem):

```typescript
Redeem Amount = Total Obligation

Example:
  Redeem Amount = ₱10,950.00
```

### 5. Payment Application Logic
When customer makes a partial payment, it's applied in this order:

```typescript
Order of Application:
  1. Penalties (pay penalties first)
  2. Interest (then pay interest)
  3. Principal (finally reduce principal)

Example:
  Partial Payment: ₱1,000
  Outstanding Penalty: ₱200
  Outstanding Interest: ₱750
  Principal: ₱10,000
  
  Step 1: Apply to penalty
    Penalty Paid = min(1,000, 200) = ₱200
    Remaining Payment = 1,000 - 200 = ₱800
  
  Step 2: Apply to interest
    Interest Paid = min(800, 750) = ₱750
    Remaining Payment = 800 - 750 = ₱50
  
  Step 3: Apply to principal
    Principal Paid = ₱50
    New Principal = 10,000 - 50 = ₱9,950
```

### 6. New Principal Loan
Calculate the remaining principal after payment:

```typescript
Formula:
  New Principal Loan = Current Principal - Principal Paid

Example:
  Current Principal: ₱10,000
  Principal Paid: ₱50
  New Principal Loan = 10,000 - 50 = ₱9,950
```

### 7. Advance Interest
Calculate 1 month advance interest on the new principal:

```typescript
Formula:
  Advance Interest = New Principal Loan × (Monthly Interest Rate / 100)

Example:
  New Principal Loan: ₱9,950
  Interest Rate: 5% monthly
  
  Advance Interest = 9,950 × (5 / 100) = ₱497.50
```

### 8. Service Charge
Service charge is calculated using the dynamic API with fallback brackets:

```typescript
API Endpoint: POST /api/service-charge-config/calculate
Request Body: { amount: newPrincipalLoan }

Fallback Brackets (if API fails):
  Amount ≤ ₱500:     ₱10
  Amount ≤ ₱1,000:   ₱15
  Amount ≤ ₱5,000:   ₱20
  Amount ≤ ₱10,000:  ₱30
  Amount ≤ ₱20,000:  ₱40
  Amount > ₱20,000:  ₱50

Example:
  New Principal Loan: ₱9,950
  Service Charge = ₱30 (based on bracket)
```

### 9. Net Payment
Calculate the total amount customer needs to pay:

```typescript
Formula:
  Net Payment = Partial Payment + Advance Interest + Service Charge

Example:
  Partial Payment: ₱1,000
  Advance Interest: ₱497.50
  Service Charge: ₱30
  
  Net Payment = 1,000 + 497.50 + 30 = ₱1,527.50
```

### 10. Change Calculation
Calculate change to return to customer:

```typescript
Formula:
  Change = Amount Received - Net Payment

Example:
  Amount Received: ₱2,000
  Net Payment: ₱1,527.50
  
  Change = 2,000 - 1,527.50 = ₱472.50
```

## Complete Example

### Scenario
A customer with an active loan wants to make a partial payment:

```
Loan Details:
  Transaction ID: 123
  Grant Date: 45 days ago
  Maturity Date: 15 days ago (10 days overdue)
  Principal Loan: ₱10,000
  Interest Rate: 5% monthly
  Discount: ₱0

Customer Payment:
  Partial Payment Amount: ₱1,000
  Amount Received: ₱2,000
```

### Calculation Steps

```typescript
Step 1: Calculate Interest
  Days from Grant = 45
  Daily Rate = (5 / 100) / 30 = 0.00166667
  Interest = 10,000 × 0.00166667 × 45 = ₱750.00

Step 2: Calculate Penalty
  Days Overdue = 10 (beyond grace period)
  Penalty = 10,000 × 0.02 = ₱200.00

Step 3: Total Obligation
  Total Obligation = 10,000 + 750 + 200 - 0 = ₱10,950.00

Step 4: Redeem Amount
  Redeem Amount = ₱10,950.00

Step 5: Apply Partial Payment (₱1,000)
  Pay Penalty: ₱200
  Pay Interest: ₱750
  Pay Principal: ₱50
  
  New Principal = 10,000 - 50 = ₱9,950

Step 6: Calculate Advance Interest
  Advance Interest = 9,950 × 0.05 = ₱497.50

Step 7: Calculate Service Charge
  Service Charge = ₱30 (for amount ₱9,950)

Step 8: Calculate Net Payment
  Net Payment = 1,000 + 497.50 + 30 = ₱1,527.50

Step 9: Calculate Change
  Change = 2,000 - 1,527.50 = ₱472.50
```

### Final Values

```
Outstanding Interest: ₱750.00
Outstanding Penalty: ₱200.00
Partial Payment: ₱1,000.00
New Principal Loan: ₱9,950.00
Advance Interest: ₱497.50
Service Charge: ₱30.00
Net Payment: ₱1,527.50
Redeem Amount: ₱10,950.00
Amount Received: ₱2,000.00
Change: ₱472.50
```

## API Integration

### Partial Payment Endpoint
```typescript
POST /api/transactions/partial

Request Body:
{
  transactionId: number,          // Integer ID (not transaction number string)
  partialPayment: number,         // Amount applied to loan
  interestPaid: number,           // Interest amount paid
  penaltyPaid: number,            // Penalty amount paid
  newPrincipal: number,           // New principal after payment
  advanceInterest: number,        // Advance interest charged
  serviceCharge: number,          // Service charge
  amountReceived: number,         // Cash received from customer
  change: number,                 // Change returned
  totalPaid: number               // Total amount paid (net payment)
}

Response:
{
  success: boolean,
  message: string,
  data: {
    transactionId: number,
    updatedBalance: number,
    paymentRecorded: boolean
  }
}
```

### Service Charge Calculation Endpoint
```typescript
POST /api/service-charge-config/calculate

Request Body:
{
  amount: number  // New principal loan amount
}

Response:
{
  success: boolean,
  data: {
    serviceCharge: number
  }
}
```

## Code Implementation

### Key Methods

#### calculatePartialPayment()
```typescript
async calculatePartialPayment() {
  // 1. Update appraisal value
  this.partialComputation.appraisalValue = this.getTotalAppraisalValue();

  // 2. Calculate interest (daily rate from grant date)
  if (this.transactionInfo.grantedDate) {
    const grantDate = new Date(this.transactionInfo.grantedDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const monthlyRate = this.partialComputation.interestRate / 100;
    const dailyRate = monthlyRate / 30;
    this.partialComputation.interest = this.partialComputation.principalLoan * dailyRate * daysDiff;
  }

  // 3. Calculate penalty using service
  if (this.transactionInfo.maturedDate) {
    const maturityDate = new Date(this.transactionInfo.maturedDate);
    const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
      this.partialComputation.principalLoan,
      maturityDate
    );
    this.partialComputation.penalty = penaltyDetails.penaltyAmount;
  }

  // 4. Calculate total obligation
  const totalObligation = this.partialComputation.principalLoan + 
                         this.partialComputation.interest + 
                         this.partialComputation.penalty - 
                         this.partialComputation.discount;

  // 5. Set redeem amount
  this.partialComputation.redeemAmount = totalObligation;

  // 6. If partial payment specified, calculate new principal and charges
  if (this.partialComputation.partialPay > 0) {
    // Apply payment: penalties first, then interest, then principal
    let remainingPayment = this.partialComputation.partialPay;
    let penaltyPaid = Math.min(remainingPayment, this.partialComputation.penalty);
    remainingPayment -= penaltyPaid;
    
    let interestPaid = Math.min(remainingPayment, this.partialComputation.interest);
    remainingPayment -= interestPaid;
    
    let principalPaid = remainingPayment;
    
    // Calculate new principal
    this.partialComputation.newPrincipalLoan = this.partialComputation.principalLoan - principalPaid;
    
    // Calculate advance interest (1 month)
    const monthlyRate = this.partialComputation.interestRate / 100;
    this.partialComputation.advanceInterest = this.partialComputation.newPrincipalLoan * monthlyRate;
    
    // Calculate service charge
    this.partialComputation.advServiceCharge = await this.calculateServiceCharge(
      this.partialComputation.newPrincipalLoan
    );
    
    // Calculate net payment
    this.partialComputation.netPayment = 
      this.partialComputation.partialPay + 
      this.partialComputation.advanceInterest + 
      this.partialComputation.advServiceCharge;
  }

  this.calculateChange();
}
```

#### calculateServiceCharge()
```typescript
async calculateServiceCharge(amount: number): Promise<number> {
  try {
    const response = await fetch('http://localhost:3000/api/service-charge-config/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ amount })
    });

    const result = await response.json();
    
    if (result.success) {
      return result.data.serviceCharge;
    } else {
      return this.calculateFallbackServiceCharge(amount);
    }
  } catch (error) {
    return this.calculateFallbackServiceCharge(amount);
  }
}
```

#### processPayment()
```typescript
async processPayment() {
  if (!this.canProcessPayment()) {
    this.toastService.showError('Error', 'Amount received is insufficient');
    return;
  }

  if (!this.transactionId) {
    this.toastService.showError('Error', 'Transaction ID not found');
    return;
  }

  this.isLoading = true;

  try {
    const paymentData = {
      transactionId: this.transactionId,
      partialPayment: this.partialComputation.partialPay,
      interestPaid: this.partialComputation.interest,
      penaltyPaid: this.partialComputation.penalty,
      newPrincipal: this.partialComputation.newPrincipalLoan,
      advanceInterest: this.partialComputation.advanceInterest,
      serviceCharge: this.partialComputation.advServiceCharge,
      amountReceived: this.partialComputation.amountReceived,
      change: this.partialComputation.change,
      totalPaid: this.partialComputation.netPayment
    };

    const response = await fetch('http://localhost:3000/api/transactions/partial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (result.success) {
      this.toastService.showSuccess('Success', 'Partial payment processed successfully');
      setTimeout(() => {
        this.router.navigate(['/cashier-dashboard']);
      }, 1500);
    } else {
      this.toastService.showError('Error', result.message || 'Failed to process partial payment');
    }
  } catch (error) {
    console.error('Error processing partial payment:', error);
    this.toastService.showError('Error', 'Failed to process partial payment');
  } finally {
    this.isLoading = false;
  }
}
```

## Business Rules

### Payment Application Order
1. **Penalties First**: Any overdue penalties are paid first
2. **Interest Second**: Accrued interest is paid next
3. **Principal Last**: Remaining amount reduces the principal

### Penalty Calculation Rules
- **Not Matured**: No penalty if maturity date hasn't been reached
- **Grace Period (0-3 days)**: Daily penalty calculation
  - Formula: (Principal × 2% / 30) × Days Overdue
- **Beyond Grace (4+ days)**: Full month penalty
  - Formula: Principal × 2%

### Interest Calculation Rules
- **Daily Rate**: Monthly interest rate divided by 30
- **Calculation Period**: From grant date to current date
- **Advance Interest**: 1 month prepaid on new principal

### Service Charge Rules
- Applied to the new principal loan amount
- Calculated dynamically via API
- Fallback to bracket system if API unavailable

## Testing Scenarios

### Test Case 1: Early Payment (No Penalty)
```
Given:
  - Grant Date: 10 days ago
  - Maturity Date: 20 days from now (not yet matured)
  - Principal: ₱5,000
  - Interest Rate: 5% monthly
  - Partial Payment: ₱500

Expected:
  - Interest: ₱5,000 × (5/100/30) × 10 = ₱83.33
  - Penalty: ₱0 (not yet matured)
  - Payment Applied: ₱83.33 to interest, ₱416.67 to principal
  - New Principal: ₱5,000 - ₱416.67 = ₱4,583.33
  - Advance Interest: ₱4,583.33 × 0.05 = ₱229.17
  - Service Charge: ₱20
  - Net Payment: ₱500 + ₱229.17 + ₱20 = ₱749.17
```

### Test Case 2: Grace Period (Daily Penalty)
```
Given:
  - Grant Date: 32 days ago
  - Maturity Date: 2 days ago (2 days overdue)
  - Principal: ₱10,000
  - Interest Rate: 5% monthly
  - Partial Payment: ₱1,000

Expected:
  - Interest: ₱10,000 × (5/100/30) × 32 = ₱533.33
  - Penalty: (₱10,000 × 0.02 / 30) × 2 = ₱13.33
  - Payment Applied: ₱13.33 to penalty, ₱533.33 to interest, ₱453.34 to principal
  - New Principal: ₱10,000 - ₱453.34 = ₱9,546.66
  - Advance Interest: ₱9,546.66 × 0.05 = ₱477.33
  - Service Charge: ₱30
  - Net Payment: ₱1,000 + ₱477.33 + ₱30 = ₱1,507.33
```

### Test Case 3: Beyond Grace Period (Full Penalty)
```
Given:
  - Grant Date: 45 days ago
  - Maturity Date: 15 days ago (15 days overdue)
  - Principal: ₱15,000
  - Interest Rate: 5% monthly
  - Partial Payment: ₱2,000

Expected:
  - Interest: ₱15,000 × (5/100/30) × 45 = ₱1,125.00
  - Penalty: ₱15,000 × 0.02 = ₱300.00
  - Payment Applied: ₱300 to penalty, ₱1,125 to interest, ₱575 to principal
  - New Principal: ₱15,000 - ₱575 = ₱14,425
  - Advance Interest: ₱14,425 × 0.05 = ₱721.25
  - Service Charge: ₱30
  - Net Payment: ₱2,000 + ₱721.25 + ₱30 = ₱2,751.25
```

### Test Case 4: Large Partial Payment
```
Given:
  - Grant Date: 60 days ago
  - Maturity Date: 30 days ago (30 days overdue)
  - Principal: ₱20,000
  - Interest Rate: 5% monthly
  - Partial Payment: ₱5,000

Expected:
  - Interest: ₱20,000 × (5/100/30) × 60 = ₱2,000.00
  - Penalty: ₱20,000 × 0.02 = ₱400.00
  - Total Obligation: ₱20,000 + ₱2,000 + ₱400 = ₱22,400
  - Payment Applied: ₱400 to penalty, ₱2,000 to interest, ₱2,600 to principal
  - New Principal: ₱20,000 - ₱2,600 = ₱17,400
  - Advance Interest: ₱17,400 × 0.05 = ₱870.00
  - Service Charge: ₱40
  - Net Payment: ₱5,000 + ₱870 + ₱40 = ₱5,910.00
```

### Test Case 5: Small Partial Payment (Only Covers Penalties)
```
Given:
  - Grant Date: 50 days ago
  - Maturity Date: 20 days ago (20 days overdue)
  - Principal: ₱30,000
  - Interest Rate: 5% monthly
  - Partial Payment: ₱500

Expected:
  - Interest: ₱30,000 × (5/100/30) × 50 = ₱2,500.00
  - Penalty: ₱30,000 × 0.02 = ₱600.00
  - Payment Applied: ₱500 to penalty (not enough to cover all penalty)
  - New Principal: ₱30,000 (unchanged, payment didn't reach principal)
  - Advance Interest: ₱30,000 × 0.05 = ₱1,500.00
  - Service Charge: ₱50
  - Net Payment: ₱500 + ₱1,500 + ₱50 = ₱2,050.00
```

## Dependencies

### Services
- **PenaltyCalculatorService**: Calculates penalties based on maturity date
- **ToastService**: Displays notifications to user
- **Router**: Navigates to dashboard after successful payment

### APIs
- **POST /api/transactions/partial**: Processes partial payment
- **POST /api/service-charge-config/calculate**: Calculates dynamic service charge
- **GET /api/transactions/search/{ticketNumber}**: Searches for transaction

## Database Updates (Backend Required)

The backend endpoint should update the following:

### transactions table
```sql
UPDATE transactions SET
  principal_amount = $1,      -- New principal after partial payment
  balance = $2,               -- Updated remaining balance
  amount_paid = amount_paid + $3,  -- Accumulate total paid
  penalty_amount = $4,        -- Updated penalty (if any remaining)
  status = $5,                -- Status (may remain 'active')
  updated_at = NOW()
WHERE id = $6
```

### payment_history table (if exists)
```sql
INSERT INTO payment_history (
  transaction_id,
  payment_type,
  amount_paid,
  interest_paid,
  penalty_paid,
  principal_paid,
  advance_interest,
  service_charge,
  payment_date,
  created_at
) VALUES ($1, 'partial', $2, $3, $4, $5, $6, $7, NOW(), NOW())
```

### audit_logs table
```sql
INSERT INTO audit_logs (
  user_id,
  action,
  entity_type,
  entity_id,
  changes,
  created_at
) VALUES ($1, 'partial_payment', 'transaction', $2, $3, NOW())
```

## Error Handling

### Validation Checks
1. Transaction ID must exist
2. Amount received must be sufficient for net payment
3. Partial payment must be greater than 0
4. Transaction must have items (pawnedItems.length > 0)
5. Transaction status must be 'active' or 'matured'

### API Error Handling
- Service charge API failure: Falls back to bracket calculation
- Transaction processing failure: Shows error toast, doesn't navigate
- Network errors: Logged to console, user-friendly message shown

## UI Enhancements

### Information Tooltips
- **Penalty Info**: Shows why penalty is calculated (grace period status, days overdue)
- **Interest Info**: Shows daily rate calculation and days elapsed

### Navigation
- Success: Redirects to `/cashier-dashboard` after 1.5 seconds
- Cancel: Returns to previous page

## Notes
- All calculations are performed asynchronously to accommodate API calls
- Service charge is fetched dynamically but has a reliable fallback
- Payment application order ensures fair debt settlement
- Transaction ID (integer) is used for API calls, not transaction number (string)
- Advance interest and service charge are charged on the new principal amount
- Change calculation ensures accurate cash handling

## Future Enhancements
1. Add payment history display
2. Implement payment schedule visualization
3. Add multiple partial payment tracking
4. Support for payment plans
5. Print payment receipt functionality
6. SMS notification for successful payment
