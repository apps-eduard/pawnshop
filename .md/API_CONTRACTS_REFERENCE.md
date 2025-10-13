# API Contracts Reference

This document outlines the exact API contracts between frontend and backend for all transaction types to prevent parameter mismatches.

## Authentication
All requests require:
```
Headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

---

## 1. Additional Loan
**Endpoint:** `POST /api/transactions/additional-loan`

**Required Parameters:**
- `originalTicketId` (number) - The original transaction ID
- `additionalAmount` (number) - The additional loan amount

**Optional Parameters:**
- `newInterestRate` (number) - New interest rate for the loan
- `newServiceCharge` (number) - New service charge
- `newMaturityDate` (string/date) - New maturity date
- `newExpiryDate` (string/date) - New expiry date
- `notes` (string) - Additional notes

**Frontend Implementation:**
```typescript
{
  originalTicketId: this.transactionId,
  additionalAmount: this.additionalComputation.additionalAmount,
  newInterestRate: this.additionalComputation.interestRate
}
```

---

## 2. Partial Payment
**Endpoint:** `POST /api/transactions/partial-payment`

**Required Parameters:**
- `ticketId` (number) - The transaction ID
- `partialPayment` (number) - The partial payment amount
- `newPrincipalLoan` (number) - The new principal loan amount after payment

**Optional Parameters:**
- `discountAmount` (number) - Discount applied (default: 0)
- `advanceInterest` (number) - Advance interest paid
- `netPayment` (number) - Net payment amount
- `notes` (string) - Additional notes

**Frontend Implementation:**
```typescript
{
  ticketId: this.transactionId,
  partialPayment: this.partialComputation.partialPay,
  newPrincipalLoan: this.partialComputation.newPrincipalLoan,
  discountAmount: this.partialComputation.discount || 0,
  advanceInterest: this.partialComputation.advanceInterest,
  netPayment: this.partialComputation.netPayment,
  notes: `Partial payment - Change: ₱${this.partialComputation.change.toFixed(2)}`
}
```

---

## 3. Redeem
**Endpoint:** `POST /api/transactions/redeem`

**Required Parameters:**
- `ticketId` (number) - The transaction ID
- `redeemAmount` (number) - The redemption amount

**Optional Parameters:**
- `transactionNumber` (string) - Transaction number for reference
- `penaltyAmount` (number) - Penalty amount
- `discountAmount` (number) - Discount applied
- `totalDue` (number) - Total amount due
- `notes` (string) - Additional notes

**Frontend Implementation:**
```typescript
{
  ticketId: this.transactionId,
  transactionNumber: this.transactionNumber,
  redeemAmount: this.redeemComputation.redeemAmount,
  penaltyAmount: this.redeemComputation.penalty,
  discountAmount: this.redeemComputation.discount,
  totalDue: this.redeemComputation.dueAmount,
  notes: `Redeemed with change: ₱${this.redeemComputation.change.toFixed(2)}`
}
```

---

## 4. Renew
**Endpoint:** `POST /api/transactions/renew`

**Required Parameters:**
- `ticketId` (number) - The transaction ID
- `renewalFee` (number) - The total renewal fee amount

**Optional Parameters:**
- `newInterestRate` (number) - New interest rate after renewal
- `newMaturityDate` (string/date) - New maturity date (backend calculates if not provided)
- `newExpiryDate` (string/date) - New expiry date (backend calculates if not provided)
- `notes` (string) - Additional notes

**Frontend Implementation:**
```typescript
{
  ticketId: this.transactionId,
  renewalFee: this.renewComputation.totalRenewAmount,
  newInterestRate: this.renewComputation.interestRate,
  newMaturityDate: this.transactionInfo.newMaturityDate,
  newExpiryDate: this.transactionInfo.newExpiryDate,
  notes: `Renewal - Change: ₱${this.renewComputation.change.toFixed(2)}`
}
```

---

## Common Issues to Avoid

### ❌ Wrong Parameter Names
- Don't use `transactionId` when backend expects `ticketId` or `originalTicketId`
- Don't send frontend calculation results the backend doesn't need
- Check backend validation: most require specific field names

### ✅ Best Practices
1. **Check backend validation first** - Look for `if (!field)` checks in the endpoint
2. **Send only what's needed** - Backend recalculates most values
3. **Use consistent naming** - Match backend parameter names exactly
4. **Include notes** - Always send helpful notes for audit trails

### Debug Checklist
When you get 400 Bad Request:
1. Check backend console logs - it shows the received body
2. Look for `undefined` fields in backend logs
3. Compare frontend payload with backend's `req.body` destructuring
4. Verify parameter names match exactly (case-sensitive)

---

## Response Format
All endpoints return:
```typescript
{
  success: boolean,
  message?: string,
  data?: {
    transactionId?: string,
    newBalance?: number,
    // ... other transaction-specific data
  }
}
```

**Success Response:** `result.success === true`
**Error Response:** `result.success === false` with `result.message`

---

**Last Updated:** January 2025 - After fixing additional-loan and renew parameter mismatches
