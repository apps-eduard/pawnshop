# Sold Today Card - Final Price Fix

## Issue Description
The "SOLD TODAY" card in the auctioneer dashboard was showing the original auction price (₱3,000) instead of the actual sale price after discount (₱2,500). When an item is sold with a discount, the dashboard should display the final sale amount, not the initial auction price.

## Root Cause
Multiple API endpoints were using `auction_price` column instead of `final_price` column when calculating revenue from sold items:
- `auction_price`: The initial price set for auction
- `final_price`: The actual sale price after discount (auction_price - discount_amount)

## Files Modified

### 1. `pawn-api/routes/auctioneer.js`
**Changed:** Dashboard statistics queries for sold items

**Lines Updated:**
- **Sold Today** (line 60): `SUM(pi.auction_price)` → `SUM(pi.final_price)`
- **Sold This Month** (line 70): `SUM(pi.auction_price)` → `SUM(pi.final_price)`
- **Sold This Year** (line 80): `SUM(pi.auction_price)` → `SUM(pi.final_price)`
- **Average Sale Price** (line 91): `AVG(pi.auction_price)` → `AVG(pi.final_price)` and `pi.auction_price IS NOT NULL` → `pi.final_price IS NOT NULL`

**Impact:** All auctioneer dashboard cards now show actual sale revenue after discounts.

### 2. `pawn-api/routes/statistics.js`
**Changed:** Today's statistics for auction sales

**Line Updated:**
- Line 30: `COALESCE(SUM(auction_price), 0)` → `COALESCE(SUM(final_price), 0)`

**Impact:** Today's auction sales statistics now reflect actual revenue after discounts.

### 3. `pawn-api/routes/reports.js`
**Changed:** Transaction and revenue reports for auction sales

**Lines Updated:**
- **Transaction Report** (line 97): `COALESCE(SUM(auction_price), 0)` → `COALESCE(SUM(final_price), 0)`
- **Revenue Report** (line 176): `COALESCE(SUM(auction_price), 0)` → `COALESCE(SUM(final_price), 0)`
- **Expired Items Summary** (line 351): Added CASE statement to use `final_price` for sold items, `auction_price` for others

**Impact:** All reports now show accurate sale revenue after discounts.

## Database Schema Reference

### `pawn_items` Table - Sale Columns
```sql
auction_price      DECIMAL(10,2)  -- Initial auction price set
discount_amount    DECIMAL(10,2)  -- Discount given to buyer
final_price        DECIMAL(10,2)  -- Actual sale price (auction_price - discount_amount)
received_amount    DECIMAL(10,2)  -- Amount received from buyer
status             VARCHAR(50)    -- Item status ('sold' for sold items)
sold_date          DATE           -- Date item was sold
```

## Example Scenario

**Before Fix:**
- Item auction price: ₱3,000
- Discount applied: ₱500
- Final sale price: ₱2,500
- Dashboard "SOLD TODAY" shows: ₱3,000 ❌

**After Fix:**
- Item auction price: ₱3,000
- Discount applied: ₱500
- Final sale price: ₱2,500
- Dashboard "SOLD TODAY" shows: ₱2,500 ✅

## Testing Checklist

- [ ] Sell an item with a discount
- [ ] Verify "SOLD TODAY" card shows final price (after discount)
- [ ] Verify "SOLD THIS MONTH" card shows correct total
- [ ] Verify "SOLD THIS YEAR" card shows correct total
- [ ] Verify "AVERAGE SALE PRICE" reflects actual sale prices
- [ ] Check transaction reports show correct auction revenue
- [ ] Check revenue reports show correct auction revenue
- [ ] Verify expired items report handles sold vs unsold items correctly

## Notes

- Items that are **not yet sold** (ready for auction) still correctly use `auction_price`
- Only queries for **sold items** (`status = 'sold'`) now use `final_price`
- The fix ensures accurate revenue reporting across all dashboards and reports
- Discount tracking is now properly reflected in all financial summaries

## Date Fixed
October 13, 2025
