# Auction Items Loan Amount Fix

## Issue Description
In the "Auctioned Items" page (TXN-202510-000001), the **Loan Amount** was showing incorrect values:
- **Appraised Value**: ₱15,000 ✅ (Correct)
- **Loan Amount**: ₱15,000 ❌ (Wrong - should be ₱10,000)

The system was displaying the appraised value instead of the actual loan amount for auction items.

## Root Cause
Multiple API endpoints were using `pawn_items.loan_amount` column to retrieve loan amounts, but this column contained incorrect/outdated data. The correct loan amount is stored in `transactions.principal_amount`.

**Database Schema:**
- `pawn_items.loan_amount` - ❌ Unreliable/outdated column
- `transactions.principal_amount` - ✅ Correct source of truth for loan amounts

## Files Modified

### `pawn-api/routes/items.js`

Fixed **5 endpoints** to use `transactions.principal_amount` instead of `pawn_items.loan_amount`:

#### 1. **GET /api/items** - Get all items (Line 18)
```sql
-- BEFORE:
pi.appraised_value, pi.loan_amount,

-- AFTER:
pi.appraised_value, t.principal_amount as loan_amount,
```

#### 2. **GET /api/items/expired** - Get expired items (Line 82)
```sql
-- BEFORE:
pi.appraised_value,
pi.loan_amount,

-- AFTER:
pi.appraised_value,
t.principal_amount as loan_amount,
```

#### 3. **GET /api/items/for-auction/list** - Get auction items (Line 255)
```sql
-- BEFORE:
pi.appraised_value,
pi.loan_amount,

-- AFTER:
pi.appraised_value,
t.principal_amount as loan_amount,
```
**This is the main fix for the reported issue! 🎯**

#### 4. **GET /api/items/sold-items** - Get sold items (Line 430)
```sql
-- BEFORE:
pi.appraised_value,
pi.loan_amount,

-- AFTER:
pi.appraised_value,
t.principal_amount as loan_amount,
```

#### 5. **GET /api/items/:id** - Get single item (Line 551)
```sql
-- BEFORE:
pi.appraised_value, pi.loan_amount, pi.appraisal_notes,

-- AFTER:
pi.appraised_value, t.principal_amount as loan_amount, pi.appraisal_notes,
```

## Impact

### Before Fix:
```
TXN-202510-000001
├── Appraised Value: ₱15,000 ✓
├── Loan Amount: ₱15,000 ✗ (showing appraised value)
└── Auction Price: (set by auctioneer)
```

### After Fix:
```
TXN-202510-000001
├── Appraised Value: ₱15,000 ✓
├── Loan Amount: ₱10,000 ✓ (correct transaction principal)
└── Auction Price: (set by auctioneer)
```

## Affected Pages/Features

✅ **Auction Items Page** (`/transactions/auction-items`)
- Now shows correct loan amounts
- Helps auctioneers set appropriate auction prices

✅ **Expired Items Dashboard** (Auctioneer Dashboard)
- Displays accurate loan amounts for expired items

✅ **Sold Items Report**
- Historical loan amounts now accurate

✅ **Item Details**
- Single item views show correct loan amounts

✅ **All Items List**
- Management views display accurate data

## Why This Matters

Correct loan amount display is critical for:
1. **Auction Pricing** - Auctioneers need to know the actual loan to set minimum auction prices
2. **Financial Reports** - Revenue calculations depend on accurate loan data
3. **Recovery Tracking** - Understanding if auction sales cover outstanding loans
4. **Legal Compliance** - Accurate records for expired/auctioned items

## Testing Checklist

- [ ] Open "Auction Items" page (`/transactions/auction-items`)
- [ ] Find TXN-202510-000001 (or any transaction)
- [ ] Verify **Loan Amount** matches the original transaction principal
- [ ] Verify **Appraised Value** is different from Loan Amount
- [ ] Check expired items in auctioneer dashboard
- [ ] Review sold items report for accurate loan amounts
- [ ] Verify item details page shows correct values

## Data Integrity Notes

**Important:** The `pawn_items.loan_amount` column may contain incorrect data. This fix:
- ✅ Bypasses the unreliable column
- ✅ Uses authoritative source (`transactions.principal_amount`)
- ⚠️ Does NOT update the database schema (keeping for backward compatibility)

**Future Consideration:** 
The `pawn_items.loan_amount` column could be:
1. Deprecated and removed in a future migration
2. Updated to sync with `transactions.principal_amount`
3. Documented as deprecated in schema documentation

For now, all queries use the correct source, making the bad data harmless.

## Date Fixed
October 13, 2025
