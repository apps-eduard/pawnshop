# Transaction Status Display vs Database Status - EXPLAINED ✅

## 🔍 Issue Report

**Ticket Number:** TXN-202510-000002  
**Expected:** Should show as "Expired"  
**Actual:** Shows as "Active"  
**Reason:** System design - Database status ≠ Display status

---

## 📊 How the System Works

### Two Types of Status:

#### 1. **Database Status** (transactions.status field)
- Stored in the `transactions` table
- Values: `'active'`, `'redeemed'`, `'renewed'`, `'auctioned'`, etc.
- **Does NOT automatically update based on dates**
- Only changes when a transaction action is performed:
  - Customer redeems → status = 'redeemed'
  - Customer renews → old status = 'renewed', new transaction = 'active'
  - Item auctioned → status = 'auctioned'

#### 2. **Display Status** (calculated on frontend)
- Calculated in real-time by `TransactionCalculationService.getLoanStatus()`
- Based on comparing current date with maturity_date and expiry_date
- Logic:
  ```typescript
  if (today > expiry_date) {
    return 'Expired';    // Display as "Expired"
  } else if (today >= maturity_date) {
    return 'Matured';    // Display as "Matured"
  } else {
    return 'Premature';  // Display as "Active/Premature"
  }
  ```

---

## 🎯 Your Specific Case: TXN-202510-000002

### Database Record:
```
Transaction Number: TXN-202510-000002
Database Status: active
Granted Date: January 8, 2025
Maturity Date: February 8, 2025
Expiry Date: May 8, 2025
Today: October 8, 2025
Days Past Expiry: 153 days
```

### Why it shows as "Active":
✅ The **database status field** is `'active'` (correct per design)  
❌ The **frontend display** should show `'Expired'` (calculated based on expiry_date)

---

## 🔧 Where Display Status SHOULD Be Calculated

### 1. Transaction List (Frontend)

**File:** `pawn-web/src/app/features/management/transaction-management/transaction-management.ts`

The frontend should use `TransactionCalculationService.getLoanStatus()` to display the correct status:

```typescript
// In the component
import { TransactionCalculationService } from '../../../core/services/transaction-calculation.service';

// In the template
{{ calculationService.getLoanStatus(transaction.maturity_date, transaction.expiry_date) }}
```

### 2. Transaction Search Results

Any component displaying transaction info should calculate the display status:

```typescript
getDisplayStatus(transaction: any): string {
  return this.calculationService.getLoanStatus(
    transaction.matured_date, 
    transaction.expired_date
  );
}
```

---

## 📋 Design Rationale

### Why not auto-update database status?

1. **Audit Trail**: Keeping status as 'active' preserves the original state
2. **Flexible Queries**: Can query expired items with `WHERE expiry_date < CURRENT_DATE`
3. **Business Logic**: Status changes should be explicit business events (redeem, renew, auction)
4. **History**: Transaction history shows when status actually changed, not when date passed

### Benefits:
✅ Clear separation between date-based logic and business actions  
✅ Simpler database updates (no cron jobs needed)  
✅ Accurate audit trail (know exactly when actions were taken)  
✅ Flexible reporting (can query by date OR status)

---

## 🛠️ Solution: Fix Frontend Display

### Option 1: Add Computed Property (Recommended)

Update transaction list component to show calculated status:

```typescript
// In transaction-management.ts or similar component
getDisplayStatus(transaction: Transaction): string {
  // If transaction is already closed (redeemed, renewed, etc.), show that
  if (transaction.status !== 'active') {
    return transaction.status;
  }
  
  // Otherwise calculate based on dates
  return this.calculationService.getLoanStatus(
    transaction.maturity_date,
    transaction.expiry_date
  );
}
```

```html
<!-- In template -->
<span [ngClass]="{
  'text-green-600': getDisplayStatus(transaction) === 'Premature',
  'text-yellow-600': getDisplayStatus(transaction) === 'Matured',
  'text-red-600': getDisplayStatus(transaction) === 'Expired'
}">
  {{ getDisplayStatus(transaction) }}
</span>
```

### Option 2: Add Display Status in API Response

Update backend to include calculated display_status:

```javascript
// In routes/transactions.js
router.get('/api/transactions', async (req, res) => {
  // ... fetch transactions ...
  
  const transactionsWithDisplayStatus = transactions.map(t => {
    let displayStatus = t.status;
    
    if (t.status === 'active') {
      const today = new Date();
      const expiryDate = new Date(t.expiry_date);
      const maturityDate = new Date(t.maturity_date);
      
      if (today > expiryDate) {
        displayStatus = 'expired';
      } else if (today >= maturityDate) {
        displayStatus = 'matured';
      }
    }
    
    return {
      ...t,
      display_status: displayStatus
    };
  });
  
  res.json({ data: transactionsWithDisplayStatus });
});
```

---

## ✅ Recommended Action

1. **Keep database status as 'active'** ✅ (correct design)
2. **Update frontend to calculate display status** ✅ (use TransactionCalculationService)
3. **Show both statuses if needed**:
   - Badge: "Expired" (calculated, red color)
   - Small text: "Status: Active" (database, gray color)

---

## 📝 Summary

**Q:** Why does TXN-202510-000002 show as "active" when it's expired?

**A:** The **database status** is correctly 'active'. The system design keeps it 'active' until a business action is taken (redeem, renew, auction). The **display status** should be calculated by the frontend based on comparing today's date with the expiry_date.

**Fix:** Update the frontend component to use `TransactionCalculationService.getLoanStatus()` to display "Expired" for transactions where `expiry_date < today`, even if database status is still 'active'.

---

**Last Updated:** October 8, 2025  
**Status:** Design Clarification Complete ✅
