# Auctioneer Dashboard - Transaction History Chain Feature

## 🎯 Feature Overview
Added a toggle feature in the auctioneer dashboard to display the complete transaction history chain for expired items. This helps auctioneers make better pricing decisions by seeing:
- Original loan amount
- All partial payments made
- Current principal balance
- Transaction dates and types
- Payment progression over time

---

## ✨ What's New

### 1. Enhanced Expired Items Display

#### New Loan Details Column
The "Values" column has been renamed to **"Loan Details"** and now shows:
- **Appraised Value** - Original item appraisal
- **Original Loan** - Initial loan amount from `pawn_items.loan_amount`
- **Current Balance** - Current principal from `transactions.principal_amount` (if different from original)

#### Visual Indicators
- 🟢 Current balance shown in **amber/yellow** color when different from original
- 📊 Highlighted to draw attention to loan reduction

---

### 2. Transaction History Toggle Button

#### Location
Added below each ticket number in the **Ticket Info** column

#### Button Features
- **Text:** "Show History" / "Hide History"
- **Icon:** Chevron down/up
- **Color:** Indigo blue
- **Action:** Expands row to show transaction chain

---

### 3. Expandable Transaction History Table

When "Show History" is clicked, a detailed table expands showing:

| Column | Description | Example |
|--------|-------------|---------|
| **Date** | Transaction date | Oct 1, 2025 |
| **Type** | Transaction type with color badge | Partial Payment (green) |
| **Ticket** | Transaction number | TXN-202510-000002 |
| **Principal** | Principal amount (shows reduction if partial payment) | ₱5,000 → ₱3,000 |
| **Interest** | Interest amount + advance interest if applicable | ₱150 (Adv: ₱100) |
| **Amount Paid** | Payment amount (green if paid) | ₱2,000 |
| **Balance** | Remaining balance | ₱3,150 |
| **Status** | Transaction status | active / superseded |

#### Special Features:
- ✅ **Last row highlighted** in amber - shows current state at expiration
- ✅ **Principal reduction arrows** - shows ₱10,000 → ₱5,000 for partial payments
- ✅ **Advance interest** - shown as sub-line in blue
- ✅ **Status indicators** - color-coded badges (green=active, gray=superseded, red=expired)

---

### 4. Transaction Type Color Coding

| Transaction Type | Badge Color | Purpose |
|-----------------|-------------|---------|
| New Loan | Blue | Initial loan creation |
| Renewal | Purple | Loan term extension |
| Partial Payment | Green | Payment reducing principal |
| Full Payment | Teal | Complete payment |
| Redemption | Emerald | Item redeemed |
| Additional Loan | Orange | Increased loan amount |

---

### 5. Pricing Guide Summary

At the bottom of the history table, a helpful summary shows:
```
💡 Pricing Guide: The highlighted row shows the current loan state at expiration.
   Original Loan: ₱10,000 → Current Balance: ₱5,000
```

---

## 🔧 Technical Implementation

### Backend Changes

#### New API Endpoint
**File:** `pawn-api/routes/items.js`

**Endpoint:** `GET /api/items/expired/:itemId/history`

**Purpose:** Fetch complete transaction chain for an expired item

**Response:**
```javascript
{
  success: true,
  message: 'Transaction history retrieved successfully',
  data: {
    trackingNumber: 'TXN-202510-000001',
    transactionCount: 3,
    history: [
      {
        id: 1,
        transactionNumber: 'TXN-202510-000001',
        transactionType: 'new_loan',
        transactionDate: '2025-09-01',
        principalAmount: 10000,
        interestAmount: 300,
        balance: 10300,
        status: 'superseded'
      },
      {
        id: 2,
        transactionNumber: 'TXN-202510-000002',
        transactionType: 'partial_payment',
        transactionDate: '2025-09-15',
        principalAmount: 5000,
        amountPaid: 5000,
        balance: 5150,
        newPrincipalLoan: 5000,
        status: 'superseded'
      },
      {
        id: 3,
        transactionNumber: 'TXN-202510-000003',
        transactionType: 'renewal',
        transactionDate: '2025-10-01',
        principalAmount: 5000,
        balance: 5300,
        status: 'active'
      }
    ]
  }
}
```

#### Updated Expired Items Endpoint
**File:** `pawn-api/routes/items.js`

**Endpoint:** `GET /api/items/expired`

**Added Fields:**
- `transactionId` - Transaction ID for lookups
- `trackingNumber` - For chain queries
- `currentPrincipal` - Current principal balance from transactions table

---

### Frontend Changes

#### Updated Interface
**File:** `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.ts`

**New Fields in ExpiredItem:**
```typescript
interface ExpiredItem {
  id: number;
  transactionId?: number;
  ticketNumber: string;
  trackingNumber?: string;
  // ... existing fields ...
  currentPrincipal?: number;        // ✅ NEW - current balance
  showHistory?: boolean;             // ✅ NEW - toggle state
  transactionHistory?: TransactionHistoryItem[];  // ✅ NEW - history data
  loadingHistory?: boolean;          // ✅ NEW - loading state
}
```

**New Interface:**
```typescript
interface TransactionHistoryItem {
  id: number;
  transactionNumber: string;
  transactionType: string;
  transactionDate: Date;
  maturityDate?: Date;
  expiryDate?: Date;
  principalAmount: number;
  interestRate: number;
  interestAmount: number;
  serviceCharge: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  discountAmount?: number;
  advanceInterest?: number;
  newPrincipalLoan?: number;
  status: string;
  notes?: string;
}
```

#### New Methods:
1. **`toggleTransactionHistory(item)`** - Toggle expand/collapse
2. **`loadTransactionHistory(item)`** - Fetch history from API
3. **`getTransactionTypeLabel(type)`** - Convert type to readable label
4. **`getTransactionTypeColor(type)`** - Get color class for badge

---

## 📊 Usage Example

### Scenario: Item with Partial Payments

**Original State:**
- Appraised Value: ₱15,000
- Original Loan: ₱10,000
- Granted: Sep 1, 2025

**Transaction History:**
1. **Sep 1** - New Loan: ₱10,000 (Principal: ₱10,000)
2. **Sep 15** - Partial Payment: -₱5,000 (Principal: ₱5,000)
3. **Oct 1** - Renewal: ₱0 (Principal: ₱5,000)
4. **Nov 5** - **EXPIRED** (Principal: ₱5,000)

**What Auctioneer Sees:**
```
┌──────────────────────────────────────────────────────┐
│ Loan Details                                         │
├──────────────────────────────────────────────────────┤
│ Appraised:          ₱15,000.00                       │
│ Original Loan:      ₱10,000.00                       │
│ Current Balance:    ₱5,000.00  ← In amber/yellow    │
└──────────────────────────────────────────────────────┘

[Show History] button clicked → Expands to show:

┌─────────────────────────────────────────────────────────────────────┐
│ Transaction History Chain                    [3 transactions]       │
├─────────────────────────────────────────────────────────────────────┤
│ Date    │ Type           │ Ticket  │ Principal │ Paid   │ Balance  │
├─────────┼────────────────┼─────────┼───────────┼────────┼──────────┤
│ Sep 1   │ New Loan       │ TXN-001 │ ₱10,000   │ -      │ ₱10,300  │
│ Sep 15  │ Partial Pay    │ TXN-002 │ ₱10,000   │ ₱5,000 │ ₱5,150   │
│         │                │         │ → ₱5,000  │        │          │
│ Nov 5   │ Expired        │ TXN-003 │ ₱5,000    │ -      │ ₱5,300   │ ← Highlighted
└─────────┴────────────────┴─────────┴───────────┴────────┴──────────┘

💡 Pricing Guide: Original Loan: ₱10,000 → Current Balance: ₱5,000
```

---

## 💡 Benefits for Auctioneer

### Better Pricing Decisions
1. **See Payment History** - Know if customer made any payments
2. **Current vs Original** - Understand the actual debt vs original loan
3. **Customer Behavior** - See if customer tried to pay (partial payments, renewals)
4. **Fair Pricing** - Set auction price based on actual debt, not just original loan

### Example Decision Making:

**Scenario A: No Payments Made**
- Original Loan: ₱10,000
- Current Balance: ₱10,000
- **Decision:** Set auction price at or above ₱10,000 to recover full amount

**Scenario B: Partial Payments Made**
- Original Loan: ₱10,000
- Current Balance: ₱5,000 (customer paid ₱5,000)
- **Decision:** Set auction price around ₱5,000-₱7,000 (fair to customer effort)

**Scenario C: Multiple Renewals**
- Original Loan: ₱10,000
- Renewals: 3 times (customer showing effort to keep item)
- Current Balance: ₱10,000
- **Decision:** Consider customer's repeated interest, price competitively

---

## 🚀 Testing

### To Test the Feature:

1. **Start API Server:**
   ```powershell
   cd pawn-api
   npm start
   ```

2. **Start Web App:**
   ```powershell
   cd pawn-web
   ng serve
   ```

3. **Login as Auctioneer:**
   - Username: `auctioneer`
   - Password: `auctioneer123`

4. **Navigate to Dashboard:**
   - Go to Auctioneer Dashboard
   - View expired items table

5. **Test Toggle:**
   - Click "Show History" button on any expired item
   - Verify transaction history loads and displays
   - Click "Hide History" to collapse
   - Verify it re-loads history if expanded again

6. **Verify Data:**
   - Check that Original Loan matches `pawn_items.loan_amount`
   - Check that Current Balance matches latest `transactions.principal_amount`
   - Verify transaction chain shows in chronological order
   - Confirm last row is highlighted

---

## 📝 Files Modified

### Backend
- ✅ `pawn-api/routes/items.js`
  - Updated `/expired` endpoint to include currentPrincipal and tracking data
  - Added `/expired/:itemId/history` endpoint for transaction chain

### Frontend
- ✅ `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.ts`
  - Added `TransactionHistoryItem` interface
  - Updated `ExpiredItem` interface with history fields
  - Added `toggleTransactionHistory()` method
  - Added `loadTransactionHistory()` method
  - Added `getTransactionTypeLabel()` method
  - Added `getTransactionTypeColor()` method

- ✅ `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.html`
  - Updated "Values" column to "Loan Details"
  - Added current balance display with amber highlight
  - Added "Show/Hide History" toggle button
  - Added expandable transaction history table
  - Added loading state indicator
  - Added pricing guide summary

---

## 🎯 Summary

This feature empowers auctioneers to:
- ✅ See complete transaction history at a glance
- ✅ Understand payment progression over time
- ✅ Make informed pricing decisions based on actual debt
- ✅ Differentiate between original loan and current balance
- ✅ Consider customer payment efforts when setting prices

**Result:** More accurate auction pricing and better business outcomes!

---

**Created:** October 9, 2025  
**Status:** Feature Complete ✅  
**Version:** 1.0
