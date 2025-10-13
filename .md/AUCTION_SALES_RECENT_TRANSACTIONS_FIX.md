# Auction Sales in Recent Transactions - Implementation

**Date:** October 13, 2025  
**Status:** ✅ COMPLETE  
**Issue:** Auction sales transactions were not appearing in the Cashier Dashboard's "Recent Transactions" section

## Problem

When processing auction sales (selling items to buyers), these sales were not visible in the "Recent Transactions" section of the Cashier Dashboard. This was because:

1. **Auction sales don't create transaction records** - They only update the `pawn_items` table with sale information
2. **Recent Transactions query only looked at `transactions` table** - It completely missed auction sales

## Solution

Modified the **GET `/api/transactions`** endpoint to also fetch recent auction sales from `pawn_items` table and merge them with regular transactions.

### Backend Changes

**File:** `pawn-api/routes/transactions.js`

#### 1. Added Auction Sales Query (Lines ~490-525)

```javascript
// **ALSO FETCH RECENT AUCTION SALES** (only for recent transactions, not filtered)
let auctionSales = [];
if (!search && !type && !status && !dateFrom && !dateTo) {
  // Only include auction sales when showing all recent transactions (no filters)
  const salesResult = await pool.query(`
    SELECT 
      pi.id,
      pi.sold_date as transaction_date,
      pi.sold_date as created_at,
      pi.sold_date as updated_at,
      pi.final_price,
      pi.discount_amount,
      pi.auction_price,
      pi.sale_notes,
      p.id as buyer_id,
      p.first_name,
      p.last_name,
      p.mobile_number,
      p.email,
      cat.name as category_name,
      d.name as description_name,
      pi.appraised_value,
      t.principal_amount as loan_amount,
      e.first_name as cashier_first_name,
      e.last_name as cashier_last_name,
      br.name as branch_name
    FROM pawn_items pi
    JOIN pawners p ON pi.buyer_id = p.id
    LEFT JOIN categories cat ON pi.category_id = cat.id
    LEFT JOIN descriptions d ON pi.description_id = d.id
    LEFT JOIN transactions t ON pi.transaction_id = t.id
    LEFT JOIN employees e ON t.created_by = e.id
    LEFT JOIN branches br ON t.branch_id = br.id
    WHERE pi.status = 'sold' 
      AND pi.sold_date IS NOT NULL
    ORDER BY pi.sold_date DESC, pi.id DESC
    LIMIT 10
  `);
  
  auctionSales = salesResult.rows;
  console.log(`✅ Found ${auctionSales.length} auction sales`);
}
```

**Key Points:**
- Only fetches auction sales when no filters are applied (showing recent transactions)
- Gets cashier info from the original transaction (`t.created_by`)
- Gets branch info from transaction's branch

#### 2. Map Auction Sales to Transaction Format (Lines ~640-710)

```javascript
// Map auction sales to transaction format
const auctionSaleTransactions = auctionSales.map(sale => ({
  id: `AS-${sale.id}`, // Prefix to distinguish from regular transactions
  // Transaction type specific to auction sales
  ticket_number: `SALE-${sale.id}`,
  transaction_type: 'auction_sale',
  transactionType: 'auction_sale',
  principal_amount: parseFloat(sale.loan_amount || 0),
  total_amount: parseFloat(sale.final_price || 0),
  finalPrice: parseFloat(sale.final_price || 0),
  auctionPrice: parseFloat(sale.auction_price || 0),
  discountAmount: parseFloat(sale.discount_amount || 0),
  status: 'completed',
  createdAt: sale.created_at,
  updatedAt: sale.updated_at,
  // Buyer information (using pawner fields for consistency)
  pawnerName: `${sale.first_name} ${sale.last_name}`,
  pawnerContact: sale.mobile_number,
  // Cashier information
  cashierName: `${sale.cashier_first_name || ''} ${sale.cashier_last_name || ''}`.trim(),
  // Branch information
  branchName: sale.branch_name || 'N/A',
  // Item information
  items: [{
    id: sale.id,
    categoryName: sale.category_name,
    descriptionName: sale.description_name,
    appraisedValue: sale.appraised_value,
    loanAmount: sale.loan_amount,
    status: 'sold'
  }],
  notes: sale.sale_notes,
  transactionHistory: []
}));
```

#### 3. Combine and Sort Results (Lines ~710-715)

```javascript
// Combine and sort by date (most recent first)
const allTransactions = [...transactions, ...auctionSaleTransactions]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, parseInt(limit)); // Respect limit
```

### Frontend Changes

#### 1. Added Transaction Type Label (cashier-dashboard.ts)

```typescript
getTransactionTypeLabel(type: string): string {
  const typeMap: { [key: string]: string } = {
    new_loan: 'New Loan',
    payment: 'Payment',
    renewal: 'Renewal',
    redemption: 'Redemption',
    auction_sale: 'Auction Sale'  // ✅ NEW
  };

  return typeMap[type] || type;
}
```

#### 2. Added Transaction Type Color (status-color.service.ts)

```typescript
private readonly transactionTypeColors: { [key: string]: string } = {
  // ... other colors
  'auction': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200...',
  'auction_sale': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200...',  // ✅ NEW
};
```

## Transaction ID Format

**Regular Transactions:** `TXN-202510-000001` (from `transactions` table)  
**Auction Sales:** `SALE-123` (prefixed with sale ID from `pawn_items` table)

This distinction helps identify auction sales at a glance.

## Data Flow

### Before Fix:
```
Cashier Dashboard
    ↓
GET /api/transactions
    ↓
Query: transactions table only
    ↓
Result: New loans, renewals, redemptions
    ✗ Missing: Auction sales
```

### After Fix:
```
Cashier Dashboard
    ↓
GET /api/transactions
    ↓
Query 1: transactions table (regular transactions)
Query 2: pawn_items table (auction sales where status='sold')
    ↓
Merge & Sort by date
    ↓
Result: New loans, renewals, redemptions, auction sales ✓
```

## Display Format

Auction sales now appear in Recent Transactions with:

- **Badge:** "Auction Sale" (amber/yellow color)
- **Ticket Number:** `SALE-{id}` format
- **Customer Name:** Buyer's name
- **Amount:** Final sale price (after discount)
- **Status:** Completed
- **Item Info:** Single item that was sold

## Testing

1. ✅ Create an auction sale from Auction Items page
2. ✅ Navigate to Cashier Dashboard
3. ✅ Verify auction sale appears in "Recent Transactions"
4. ✅ Verify it shows correct buyer name, amount, and date
5. ✅ Verify badge shows "Auction Sale" in amber color

## Files Modified

### Backend (1 file):
- `pawn-api/routes/transactions.js` - Added auction sales query and mapping

### Frontend (2 files):
- `pawn-web/src/app/features/dashboards/cashier-dashboard/cashier-dashboard.ts` - Added auction_sale label
- `pawn-web/src/app/core/services/status-color.service.ts` - Added auction_sale color

## Notes

- Auction sales only appear when **no filters** are applied (showing recent transactions)
- When filtering by type, status, date, or search - only regular transactions are shown
- This is intentional to keep the filter logic simple
- Auction sales can be viewed in detail in the Auction Items or Sales Reports pages

## Related Issues Fixed

- ✅ Auction sales now visible in Recent Transactions
- ✅ Cashier can see all recent activity including auction sales
- ✅ Consistent transaction display across dashboard

## Future Enhancements

Consider creating actual `transaction` records for auction sales to:
1. Simplify querying and reporting
2. Include auction sales in filtered results
3. Maintain complete transaction history in one table
4. Enable easier auditing and tracking

---

**Result:** Cashiers can now see auction sales in their Recent Transactions section! 🎉
