# 📋 Transaction Statuses and Types - Complete Guide

## Overview

This document explains all transaction statuses and types used in the pawnshop system, including when they're used and what operations are allowed for each.

---

## 🔄 Transaction Types

### 1. **new_loan**
- **Description:** Initial loan transaction when a pawner brings items to pawn
- **Created When:** Customer pawns items for the first time
- **Initial Status:** `active`
- **Records Created:**
  - Transaction record
  - Pawn ticket
  - Pawn items
  - Pawner record (if new customer)

### 2. **redemption** (redeem)
- **Description:** Customer pays off the loan and retrieves their items
- **Created When:** Redeem operation is performed
- **Parent Transaction:** References the original `new_loan` transaction
- **Status Changes:**
  - Original transaction: `active` → `redeemed`
  - Original ticket: `active` → `redeemed`
  - Items: `in_vault` → `released`
- **Payment:** Full payment required (principal + interest + penalties + service charge - discount)

### 3. **renewal** (renew)
- **Description:** Customer extends the loan period by paying renewal fee
- **Created When:** Renew operation is performed
- **Parent Transaction:** References the original transaction
- **What Happens:**
  - Original ticket dates are updated (maturity_date, expiry_date extended)
  - Renewal fee is charged (typically interest + service charge)
  - Principal remains the same
- **Status:** Stays `active`

### 4. **partial_payment**
- **Description:** Customer makes a partial payment to reduce the principal
- **Created When:** Partial payment operation is performed
- **Parent Transaction:** References the original transaction
- **What Happens:**
  - Payment amount applied to principal
  - New principal calculated
  - New interest calculated based on new principal
  - Balance updated
- **Status:** Stays `active`

### 5. **additional_loan**
- **Description:** Customer borrows more money on the same items
- **Created When:** Additional loan operation is performed
- **Parent Transaction:** References the original transaction
- **What Happens:**
  - Additional amount added to principal
  - New interest calculated
  - New maturity and expiry dates set
  - Balance increases
- **Status:** Stays `active`

---

## 🎯 Transaction Statuses

### Transaction Table Statuses

| Status | Description | Can Redeem? | Can Renew? | Can Pay Partially? | Can Add Loan? |
|--------|-------------|-------------|------------|-------------------|---------------|
| **active** | Loan is current, not yet matured | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **matured** | Passed maturity date, in grace period | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **expired** | Passed expiry date, penalties apply | ❌ No | ❌ No | ❌ No | ❌ No |
| **redeemed** | Customer paid off and retrieved items | ❌ No | ❌ No | ❌ No | ❌ No |
| **renewed** | Loan period extended | N/A (becomes active) | N/A | N/A | N/A |
| **auctioned** | Items sold at auction | ❌ No | ❌ No | ❌ No | ❌ No |
| **cancelled** | Transaction cancelled/voided | ❌ No | ❌ No | ❌ No | ❌ No |

### Pawn Ticket Statuses

| Status | Description | Searchable? | Can Process? |
|--------|-------------|-------------|--------------|
| **active** | Current, before maturity date | ✅ Yes | ✅ Yes |
| **matured** | After maturity, before expiry | ✅ Yes | ✅ Yes |
| **overdue** | After expiry, with penalties | ⚠️ Limited | ⚠️ Limited |
| **expired** | Cannot be processed | ❌ No | ❌ No |
| **redeemed** | Items released to customer | ❌ No | ❌ No |
| **auctioned** | Items sold | ❌ No | ❌ No |

### Pawn Item Statuses

| Status | Description |
|--------|-------------|
| **in_vault** | Item stored in pawnshop vault |
| **released** | Item returned to customer (after redemption) |
| **auctioned** | Item sold at auction |
| **lost** | Item lost/damaged |

---

## 📅 Status Lifecycle

### Normal Flow (Happy Path)

```
NEW LOAN
   ↓
[active] ──────────────────────────────────────┐
   │                                            │
   │ Time passes (< 30 days)                    │ Customer redeems
   ↓                                            ↓
[active] ──→ Maturity Date (30 days) ──→ [redeemed] ✅
   ↓
[matured] ─────────────────────────────────────┐
   │                                            │
   │ Grace period (90 days)                     │ Customer redeems
   │                                            ↓
   ↓                                      [redeemed] ✅
[expired] ──→ Auction ──→ [auctioned] ❌
```

### With Renewal

```
[active] ──→ Customer renews ──→ [active] (new dates)
   ↓
[matured] ─→ Customer renews ──→ [active] (extended)
```

### With Partial Payment

```
[active] ──→ Partial Payment ──→ [active] (reduced principal)
```

### With Additional Loan

```
[active] ──→ Additional Loan ──→ [active] (increased principal)
```

---

## 🔍 Search Behavior

### API Search Endpoint: `/api/transactions/search/:ticketNumber`

**What it searches for:**
- Ticket Number (e.g., `PT-SAMPLE-001`, `TXN-202510-000001`)
- NOT transaction number

**Allowed Statuses:**
- ✅ `active` - Can be found and processed
- ✅ `matured` - Can be found and processed
- ❌ `expired` - Returns 404 (not found)
- ❌ `redeemed` - Returns 400 (already processed)
- ❌ `auctioned` - Returns 400 (already processed)

**Error Messages:**
- `"Transaction not found"` - Ticket doesn't exist or is expired
- `"Ticket {number} is {status} and cannot be processed"` - Ticket exists but can't be processed

---

## 🎓 Sample Data Statuses

Based on the seed file `06_sample_loan_transactions_seeds.js`:

### Active Transactions (Can be Processed)

| Ticket Number | Category | Status | Maturity Date | Can Redeem? | Can Renew? |
|---------------|----------|--------|---------------|-------------|------------|
| PT-SAMPLE-001 | Jewelry | active | Oct 10, 2025 (3 days) | ✅ Yes | ✅ Yes |
| PT-SAMPLE-002 | Appliances | active | Oct 10, 2025 (3 days) | ✅ Yes | ✅ Yes |
| PT-SAMPLE-003 | Jewelry | active | Oct 11, 2025 (4 days) | ✅ Yes | ✅ Yes |
| PT-SAMPLE-004 | Appliances | active | Oct 11, 2025 (4 days) | ✅ Yes | ✅ Yes |

### Expired Transactions (Cannot be Processed)

| Ticket Number | Category | Status | Expired Since | Can Redeem? | Can Renew? |
|---------------|----------|--------|---------------|-------------|------------|
| PT-SAMPLE-005 | Jewelry | expired | Sept 7, 2025 (1 month) | ❌ No | ❌ No |
| PT-SAMPLE-006 | Appliances | expired | Sept 7, 2025 (1 month) | ❌ No | ❌ No |
| PT-SAMPLE-007 | Jewelry | expired | Aug 7, 2025 (2 months) | ❌ No | ❌ No |
| PT-SAMPLE-008 | Appliances | expired | Aug 7, 2025 (2 months) | ❌ No | ❌ No |

---

## 💡 Testing Guide

### For Testing Redemption:
✅ **Use these ticket numbers:**
- `PT-SAMPLE-001` (Jewelry, ₱2,700, matures in 3 days)
- `PT-SAMPLE-002` (Appliances, ₱2,700, matures in 3 days)
- `PT-SAMPLE-003` (Jewelry, ₱2,700, matures in 4 days)
- `PT-SAMPLE-004` (Appliances, ₱2,700, matures in 4 days)

❌ **Don't use these (will fail):**
- `PT-SAMPLE-005` to `PT-SAMPLE-008` - These are expired
- `TXN-SAMPLE-001` to `TXN-SAMPLE-008` - These are transaction numbers, not ticket numbers

### Common Mistakes:

1. **❌ Wrong:** Searching with transaction number
   ```
   Search: TXN-SAMPLE-001  ← Will fail (404)
   ```

2. **✅ Correct:** Searching with ticket number
   ```
   Search: PT-SAMPLE-001  ← Will work
   ```

3. **❌ Wrong:** Trying to redeem expired ticket
   ```
   Search: PT-SAMPLE-005  ← Will fail (404 or 400)
   ```

4. **✅ Correct:** Using active ticket
   ```
   Search: PT-SAMPLE-001  ← Will work
   ```

---

## 📊 Date Calculations

### Default Dates (for new loans):

| Date Type | Calculation | Example (Grant: Oct 7, 2025) |
|-----------|-------------|------------------------------|
| **Grant Date** | User input or current date | Oct 7, 2025 |
| **Transaction Date** | Current date/time | Oct 7, 2025 12:00 PM |
| **Maturity Date** | Grant Date + 1 month | Nov 7, 2025 |
| **Expiry Date** | Maturity Date + 3 months | Feb 7, 2026 |

### Status Determination:

```javascript
// Today = Oct 7, 2025

if (today < maturityDate) {
  status = 'active';        // Before Nov 7
} else if (today < expiryDate) {
  status = 'matured';       // Nov 7 - Feb 7 (grace period)
} else {
  status = 'expired';       // After Feb 7
}
```

---

## 🛠️ API Operations by Status

### Redeem Operation
**Allowed Statuses:** `active`, `matured`
```
POST /api/transactions/redeem/:ticketId
- Calculates penalties if overdue
- Applies discount if provided
- Marks transaction as 'redeemed'
- Changes items status to 'released'
```

### Renew Operation
**Allowed Statuses:** `active`, `overdue`
```
POST /api/transactions/renew/:ticketId
- Extends maturity date by 1 month
- Extends expiry date by 1 month
- Charges renewal fee (interest + service charge)
```

### Partial Payment Operation
**Allowed Statuses:** `active`, `matured`
```
POST /api/transactions/partial-payment/:ticketId
- Reduces principal amount
- Recalculates interest
- Updates balance
```

### Additional Loan Operation
**Allowed Statuses:** `active`
```
POST /api/transactions/additional-loan/:ticketId
- Increases principal amount
- Recalculates interest
- Updates balance
- Resets dates
```

---

## 📝 Summary

**Key Points to Remember:**

1. ✅ Always use **Ticket Number** (PT-XXX) for searches, not Transaction Number (TXN-XXX)
2. ✅ Only `active` and `matured` tickets can be processed
3. ✅ `expired` tickets cannot be redeemed, renewed, or modified
4. ✅ Each operation type creates a new transaction record with `parent_transaction_id`
5. ✅ Status changes are automatic based on dates
6. ✅ Use `PT-SAMPLE-001` through `PT-SAMPLE-004` for testing (active tickets)

---

**Last Updated:** October 7, 2025  
**For Questions:** Check API logs or database for actual status values
