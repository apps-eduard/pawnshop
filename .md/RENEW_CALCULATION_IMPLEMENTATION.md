# Renew Transaction Calculation Implementation

## Overview

This document details the comprehensive renew (loan renewal) calculation implementation for the pawnshop system, including interest calculation from grant date, penalty calculation using PenaltyCalculatorService, dynamic service charge via API, and proper renewal amount computation.

## Implementation Date

2025-01-XX

## Components Modified

- `pawn-web/src/app/features/transactions/renew/renew.ts`

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
  Interest Rate: 3.5% monthly
  Days from Grant: 40 days
  
  Daily Rate = (3.5 / 100) / 30 = 0.00116667
  Interest = 10,000 × 0.00116667 × 40 = ₱466.67
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

### 3. Due Amount

Calculate the total amount that must be paid to clear the current loan:

```typescript
Formula:
  Due Amount = Interest + Penalty

Note: Principal is NOT included in due amount for renewal
      (principal carries forward to new loan)

Example:
  Interest: ₱466.67
  Penalty: ₱200.00
  
  Due Amount = 466.67 + 200.00 = ₱666.67
```

### 4. New Loan Amount

The customer can choose to:
- Renew with same principal (newLoanAmount = principalLoan)
- Take additional cash (newLoanAmount > principalLoan)
- Reduce the loan (newLoanAmount < principalLoan)

```typescript
Options:
  1. Same Principal Renewal:
     New Loan Amount = Principal Loan
     
  2. Additional Loan:
     New Loan Amount = Principal Loan + Additional Cash
     
  3. Reduced Loan:
     New Loan Amount = Principal Loan - Reduction Amount

Example:
  Principal Loan: ₱10,000
  Additional Cash Desired: ₱2,000
  
  New Loan Amount = 10,000 + 2,000 = ₱12,000
```

### 5. Service Charge

Service charge is calculated using the dynamic API with fallback brackets based on the new loan amount:

```typescript
API Endpoint: POST /api/service-charge-config/calculate
Request Body: { amount: newLoanAmount }

Fallback Brackets (if API fails):
  Amount ≤ ₱500:     ₱10
  Amount ≤ ₱1,000:   ₱15
  Amount ≤ ₱5,000:   ₱20
  Amount ≤ ₱10,000:  ₱30
  Amount ≤ ₱20,000:  ₱40
  Amount > ₱20,000:  ₱50

Example:
  New Loan Amount: ₱12,000
  Service Charge = ₱30 (based on bracket)
```

### 6. Total Renew Amount

Calculate the net amount customer must pay or receive:

```typescript
Formula:
  Additional Loan = New Loan Amount - Principal Loan
  
  If Additional Loan > 0:
    // Customer taking additional cash
    Total Renew Amount = Due Amount + Service Charge - Additional Loan
  Else:
    // Customer just renewing or reducing loan
    Total Renew Amount = Due Amount + Service Charge

Example 1: Taking Additional Cash
  Due Amount: ₱666.67
  Service Charge: ₱30
  Additional Loan: ₱2,000
  
  Total Renew Amount = 666.67 + 30 - 2,000 = -₱1,303.33
  (Negative means customer receives ₱1,303.33)

Example 2: Simple Renewal (No Additional Cash)
  Due Amount: ₱666.67
  Service Charge: ₱30
  Additional Loan: ₱0
  
  Total Renew Amount = 666.67 + 30 = ₱696.67
  (Positive means customer pays ₱696.67)
```

### 7. Change Calculation

Calculate change to return to customer:

```typescript
Formula:
  Change = Received Amount - Total Renew Amount

Example 1: Customer Paying
  Received Amount: ₱1,000
  Total Renew Amount: ₱696.67
  
  Change = 1,000 - 696.67 = ₱303.33

Example 2: Customer Receiving (Taking Additional Cash)
  Received Amount: ₱0 (customer not paying)
  Total Renew Amount: -₱1,303.33 (negative)
  
  Change = 0 - (-1,303.33) = ₱1,303.33
  (Customer receives this amount)
```

## Complete Examples

### Scenario 1: Simple Renewal (Same Principal)

A customer wants to renew their loan without taking additional cash:

```text
Loan Details:
  Transaction ID: 123
  Grant Date: 40 days ago
  Maturity Date: 10 days ago (10 days overdue)
  Principal Loan: ₱10,000
  Interest Rate: 3.5% monthly

Customer Decision:
  New Loan Amount: ₱10,000 (same as principal)
  Received Amount: ₱1,000
```

#### Calculation Steps

```typescript
Step 1: Calculate Interest
  Days from Grant = 40
  Daily Rate = (3.5 / 100) / 30 = 0.00116667
  Interest = 10,000 × 0.00116667 × 40 = ₱466.67

Step 2: Calculate Penalty
  Days Overdue = 10 (beyond grace period)
  Penalty = 10,000 × 0.02 = ₱200.00

Step 3: Calculate Due Amount
  Due Amount = 466.67 + 200.00 = ₱666.67

Step 4: New Loan Amount
  New Loan Amount = ₱10,000 (customer choice)

Step 5: Calculate Service Charge
  Service Charge = ₱30 (for ₱10,000)

Step 6: Calculate Total Renew Amount
  Additional Loan = 10,000 - 10,000 = ₱0
  Total Renew Amount = 666.67 + 30 = ₱696.67

Step 7: Calculate Change
  Change = 1,000 - 696.67 = ₱303.33
```

#### Final Values

```text
Interest: ₱466.67
Penalty: ₱200.00
Due Amount: ₱666.67
New Loan Amount: ₱10,000
Service Charge: ₱30.00
Total Renew Amount: ₱696.67
Received Amount: ₱1,000.00
Change: ₱303.33
```

### Scenario 2: Renewal with Additional Cash

A customer wants to renew and take additional ₱3,000:

```text
Loan Details:
  Transaction ID: 456
  Grant Date: 35 days ago
  Maturity Date: 5 days ago (5 days overdue)
  Principal Loan: ₱15,000
  Interest Rate: 3.5% monthly

Customer Decision:
  New Loan Amount: ₱18,000 (₱15,000 + ₱3,000)
  Received Amount: ₱0 (expecting to receive cash)
```

#### Calculation Steps

```typescript
Step 1: Calculate Interest
  Days from Grant = 35
  Daily Rate = (3.5 / 100) / 30 = 0.00116667
  Interest = 15,000 × 0.00116667 × 35 = ₱612.50

Step 2: Calculate Penalty
  Days Overdue = 5 (beyond grace period)
  Penalty = 15,000 × 0.02 = ₱300.00

Step 3: Calculate Due Amount
  Due Amount = 612.50 + 300.00 = ₱912.50

Step 4: New Loan Amount
  New Loan Amount = ₱18,000 (customer choice)

Step 5: Calculate Service Charge
  Service Charge = ₱40 (for ₱18,000)

Step 6: Calculate Total Renew Amount
  Additional Loan = 18,000 - 15,000 = ₱3,000
  Total Renew Amount = 912.50 + 40 - 3,000 = -₱2,047.50
  (Negative means customer receives cash)

Step 7: Calculate Change
  Change = 0 - (-2,047.50) = ₱2,047.50
  (Amount customer receives)
```

#### Final Values

```text
Interest: ₱612.50
Penalty: ₱300.00
Due Amount: ₱912.50
New Loan Amount: ₱18,000
Service Charge: ₱40.00
Total Renew Amount: -₱2,047.50
Received Amount: ₱0.00
Change: ₱2,047.50 (customer receives this)
```

### Scenario 3: Early Renewal (No Penalty)

A customer renews before maturity date:

```text
Loan Details:
  Transaction ID: 789
  Grant Date: 15 days ago
  Maturity Date: 15 days from now (not yet matured)
  Principal Loan: ₱8,000
  Interest Rate: 3.5% monthly

Customer Decision:
  New Loan Amount: ₱10,000 (taking additional ₱2,000)
  Received Amount: ₱0
```

#### Calculation Steps

```typescript
Step 1: Calculate Interest
  Days from Grant = 15
  Daily Rate = (3.5 / 100) / 30 = 0.00116667
  Interest = 8,000 × 0.00116667 × 15 = ₱140.00

Step 2: Calculate Penalty
  Days Overdue = 0 (not yet matured)
  Penalty = ₱0.00

Step 3: Calculate Due Amount
  Due Amount = 140.00 + 0.00 = ₱140.00

Step 4: New Loan Amount
  New Loan Amount = ₱10,000

Step 5: Calculate Service Charge
  Service Charge = ₱30 (for ₱10,000)

Step 6: Calculate Total Renew Amount
  Additional Loan = 10,000 - 8,000 = ₱2,000
  Total Renew Amount = 140.00 + 30 - 2,000 = -₱1,830.00

Step 7: Calculate Change
  Change = 0 - (-1,830.00) = ₱1,830.00
```

#### Final Values

```text
Interest: ₱140.00
Penalty: ₱0.00
Due Amount: ₱140.00
New Loan Amount: ₱10,000
Service Charge: ₱30.00
Total Renew Amount: -₱1,830.00
Received Amount: ₱0.00
Change: ₱1,830.00 (customer receives this)
```

## API Integration

### Renew Transaction Endpoint

```typescript
POST /api/transactions/renew

Request Body:
{
  transactionId: number,       // Integer ID (not transaction number string)
  interestPaid: number,        // Interest amount paid
  penaltyPaid: number,         // Penalty amount paid
  newPrincipal: number,        // New principal loan amount
  serviceCharge: number,       // Service charge
  amountReceived: number,      // Cash received from customer (if paying)
  change: number,              // Change returned or cash given to customer
  totalPaid: number            // Total renew amount
}

Response:
{
  success: boolean,
  message: string,
  data: {
    transactionId: number,
    newTransactionNumber: string,
    newPrincipal: number,
    renewalDate: string
  }
}
```

### Service Charge Calculation Endpoint

```typescript
POST /api/service-charge-config/calculate

Request Body:
{
  amount: number  // New loan amount
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

#### calculateRenewAmount()

```typescript
async calculateRenewAmount() {
  // 1. Calculate interest (daily rate from grant date)
  if (this.transactionInfo.grantedDate) {
    const grantDate = new Date(this.transactionInfo.grantedDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const monthlyRate = this.renewComputation.interestRate / 100;
    const dailyRate = monthlyRate / 30;
    this.renewComputation.interest = this.renewComputation.principalLoan * dailyRate * daysDiff;
  }

  // 2. Calculate penalty using service
  if (this.transactionInfo.maturedDate) {
    const maturityDate = new Date(this.transactionInfo.maturedDate);
    const penaltyDetails = this.penaltyCalculatorService.calculatePenalty(
      this.renewComputation.principalLoan,
      maturityDate
    );
    this.renewComputation.penalty = penaltyDetails.penaltyAmount;
  }

  // 3. Calculate due amount (interest + penalty only)
  this.renewComputation.dueAmount = this.renewComputation.interest + this.renewComputation.penalty;

  // 4. Handle new loan amount
  if (this.renewComputation.newLoanAmount > 0) {
    this.renewComputation.serviceFee = await this.calculateServiceCharge(this.renewComputation.newLoanAmount);
  } else {
    this.renewComputation.newLoanAmount = this.renewComputation.principalLoan;
    this.renewComputation.serviceFee = await this.calculateServiceCharge(this.renewComputation.principalLoan);
  }

  // 5. Calculate total renew amount
  const additionalLoan = this.renewComputation.newLoanAmount - this.renewComputation.principalLoan;
  
  if (additionalLoan > 0) {
    // Customer taking additional cash
    this.renewComputation.totalRenewAmount = this.renewComputation.dueAmount + 
                                             this.renewComputation.serviceFee - 
                                             additionalLoan;
  } else {
    // Just renewing
    this.renewComputation.totalRenewAmount = this.renewComputation.dueAmount + 
                                             this.renewComputation.serviceFee;
  }

  this.calculateChange();
}
```

#### processRenew()

```typescript
async processRenew() {
  if (!this.canProcessRenew()) {
    this.toastService.showError('Error', 'Invalid renewal amount or insufficient payment');
    return;
  }

  if (!this.transactionId) {
    this.toastService.showError('Error', 'Transaction ID not found');
    return;
  }

  this.isLoading = true;

  try {
    const renewData = {
      transactionId: this.transactionId,
      interestPaid: this.renewComputation.interest,
      penaltyPaid: this.renewComputation.penalty,
      newPrincipal: this.renewComputation.newLoanAmount,
      serviceCharge: this.renewComputation.serviceFee,
      amountReceived: this.renewComputation.receivedAmount,
      change: this.renewComputation.change,
      totalPaid: this.renewComputation.totalRenewAmount
    };

    const response = await fetch('http://localhost:3000/api/transactions/renew', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(renewData)
    });

    const result = await response.json();

    if (result.success) {
      this.toastService.showSuccess('Success', 'Loan renewed successfully');
      setTimeout(() => {
        this.router.navigate(['/cashier-dashboard']);
      }, 1500);
    } else {
      this.toastService.showError('Error', result.message || 'Failed to process renewal');
    }
  } catch (error) {
    console.error('Error processing renewal:', error);
    this.toastService.showError('Error', 'Failed to process renewal');
  } finally {
    this.isLoading = false;
  }
}
```

## Business Rules

### Renewal Types

1. **Simple Renewal**: Customer pays dues (interest + penalty + service charge) to extend the loan
   - New Loan Amount = Current Principal
   - Customer pays: Due Amount + Service Charge

2. **Renewal with Additional Cash**: Customer takes additional loan
   - New Loan Amount > Current Principal
   - Customer receives: Additional Cash - Due Amount - Service Charge

3. **Renewal with Reduction**: Customer reduces the loan
   - New Loan Amount < Current Principal
   - Customer pays: Due Amount + Service Charge + Principal Reduction

### Interest Calculation Rules

- **Daily Rate**: Monthly interest rate divided by 30
- **Calculation Period**: From grant date to current date
- **Compounding**: Simple interest, not compound

### Penalty Calculation Rules

- **Not Matured**: No penalty if maturity date hasn't been reached
- **Grace Period (0-3 days)**: Daily penalty calculation
  - Formula: (Principal × 2% / 30) × Days Overdue
- **Beyond Grace (4+ days)**: Full month penalty
  - Formula: Principal × 2%

### Service Charge Rules

- Applied to the new loan amount
- Calculated dynamically via API
- Fallback to bracket system if API unavailable

## Testing Scenarios

### Test Case 1: Simple Renewal (No Additional Cash)

```text
Given:
  - Grant Date: 30 days ago
  - Maturity Date: Not overdue
  - Principal: ₱5,000
  - Interest Rate: 3.5% monthly
  - New Loan Amount: ₱5,000

Expected:
  - Interest: ₱5,000 × (3.5/100/30) × 30 = ₱175.00
  - Penalty: ₱0
  - Due Amount: ₱175.00
  - Service Charge: ₱20
  - Total Renew Amount: ₱195.00
```

### Test Case 2: Renewal with Additional ₱2,000

```text
Given:
  - Grant Date: 40 days ago
  - Maturity Date: 10 days ago (overdue)
  - Principal: ₱10,000
  - Interest Rate: 3.5% monthly
  - New Loan Amount: ₱12,000

Expected:
  - Interest: ₱10,000 × (3.5/100/30) × 40 = ₱466.67
  - Penalty: ₱10,000 × 0.02 = ₱200.00
  - Due Amount: ₱666.67
  - Service Charge: ₱30
  - Additional Loan: ₱2,000
  - Total Renew Amount: 666.67 + 30 - 2,000 = -₱1,303.33
  - Customer receives: ₱1,303.33
```

### Test Case 3: Early Renewal

```text
Given:
  - Grant Date: 10 days ago
  - Maturity Date: 20 days from now
  - Principal: ₱8,000
  - Interest Rate: 3.5% monthly
  - New Loan Amount: ₱8,000

Expected:
  - Interest: ₱8,000 × (3.5/100/30) × 10 = ₱93.33
  - Penalty: ₱0 (not yet matured)
  - Due Amount: ₱93.33
  - Service Charge: ₱30
  - Total Renew Amount: ₱123.33
```

## Dependencies

### Services

- **PenaltyCalculatorService**: Calculates penalties based on maturity date
- **ToastService**: Displays notifications to user
- **Router**: Navigates to dashboard after successful renewal

### APIs

- **POST /api/transactions/renew**: Processes loan renewal
- **POST /api/service-charge-config/calculate**: Calculates dynamic service charge
- **GET /api/transactions/search/{ticketNumber}**: Searches for transaction

## Database Updates (Backend Required)

The backend endpoint should:

1. **Close Old Transaction**:
   ```sql
   UPDATE transactions SET
     status = 'renewed',
     updated_at = NOW()
   WHERE id = $1
   ```

2. **Create New Transaction**:
   ```sql
   INSERT INTO transactions (
     customer_id,
     principal_amount,
     interest_rate,
     grant_date,
     maturity_date,
     expiry_date,
     status,
     created_at
   ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '120 days', 'active', NOW())
   ```

3. **Record Payment**:
   ```sql
   INSERT INTO payment_history (
     transaction_id,
     payment_type,
     interest_paid,
     penalty_paid,
     service_charge,
     payment_date
   ) VALUES ($1, 'renewal', $2, $3, $4, NOW())
   ```

4. **Audit Log**:
   ```sql
   INSERT INTO audit_logs (
     user_id,
     action,
     entity_type,
     entity_id,
     changes
   ) VALUES ($1, 'renewal', 'transaction', $2, $3)
   ```

## Error Handling

### Validation Checks

1. Transaction ID must exist
2. Amount received must be sufficient for total renew amount (if positive)
3. New loan amount must be greater than 0
4. Transaction must have items (items.length > 0)
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
- Negative total renew amount means customer receives cash
- Transaction ID (integer) is used for API calls, not transaction number (string)
- Old transaction is marked as 'renewed', new transaction is created
- Items from old transaction are copied to new transaction

## Future Enhancements

1. Support for partial renewals (only some items)
2. Add renewal history display
3. Implement renewal with appraisal value changes
4. Support for promotional renewal rates
5. Print renewal receipt functionality
6. SMS notification for successful renewal
7. Email summary of new loan terms
