# 🔨 Auctioneer Dashboard - How It Works

## 📋 Overview
The **Auctioneer Dashboard** is designed to manage expired pawn items and prepare them for auction by setting auction prices.

---

## 🔍 How Expired Items Are Displayed

### 1. **What Makes an Item "Expired"?**
An item appears in the auctioneer dashboard when it meets ALL these criteria:

```sql
WHERE t.expiry_date < CURRENT_DATE          -- ✅ Past expiry date
  AND pi.status = 'in_vault'                 -- ✅ Item is in vault
  AND t.status IN ('active', 'expired')      -- ✅ Transaction is active or expired
```

**Explanation:**
- **`expiry_date < CURRENT_DATE`**: The loan's grace period has ended
- **`status = 'in_vault'`**: The item is physically in the pawnshop vault (not redeemed, sold, or lost)
- **`transaction status`**: Transaction can be either 'active' (database status) or 'expired'

### 2. **Where Does the Data Come From?**
**API Endpoint:** `GET http://localhost:3000/api/items/expired`

**File:** `pawn-api/routes/items.js` (lines 66-120)

**Frontend Component:** `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.ts`

**Data Flow:**
```
Database (PostgreSQL)
    ↓
API Endpoint (/api/items/expired)
    ↓
Angular HTTP Service
    ↓
Auctioneer Dashboard Component (loadExpiredItems)
    ↓
Display in HTML Table
```

### 3. **What Information is Displayed?**
Each expired item shows:
- ✅ **Item ID** - Unique identifier
- ✅ **Category** - Type of item (Jewelry, Electronics, etc.)
- ✅ **Description** - Custom item description
- ✅ **Ticket Number** - Transaction reference
- ✅ **Pawner Name** - Customer who pawned the item
- ✅ **Appraised Value** - Original appraisal amount
- ✅ **Loan Amount** - Amount loaned to customer
- ✅ **Expired Date** - When the item expired
- ✅ **Days Expired** - How long it's been expired
- ✅ **Auction Price** - If set, shows the price; otherwise shows "Pending"
- ✅ **Status Badge** - "Pending" (yellow) or "Set for Auction" (green)

---

## 💰 Setting Auction Prices

### 1. **The Process**

#### Step 1: Identify Pending Items
Items with status **"Pending"** (yellow badge) don't have an auction price yet.

#### Step 2: Click "Set Price" Button
- Opens a modal dialog
- Shows item details (description, appraised value, original loan)
- Has an input field for entering the auction price

#### Step 3: Enter Auction Price
- Type the desired starting price for the auction
- Price must be greater than 0
- Reference information shows:
  - **Appraised Value** - What the item was valued at
  - **Original Loan** - What was borrowed against it

#### Step 4: Click "Set Price"
- Saves the auction price to the database
- Updates the `auction_price` column in `pawn_items` table
- Item status changes to **"Set for Auction"** (green badge)
- Item now appears in the auction list

### 2. **What Happens in the Backend?**
**API Endpoint:** `POST http://localhost:3000/api/items/set-auction-price`

**File:** `pawn-api/routes/items.js` (lines 312-372)

**Process:**
1. ✅ Validates item ID and auction price
2. ✅ Checks if item exists
3. ✅ Verifies item is actually expired
4. ✅ Updates `pawn_items.auction_price` column
5. ✅ Sets `updated_at` timestamp
6. ✅ Returns success response

**SQL Query:**
```sql
UPDATE pawn_items
SET auction_price = $1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2
```

### 3. **Visual Status Change**
- **Before Setting Price:** Yellow "Pending" badge, "Set Price" button
- **After Setting Price:** Green "Set for Auction" badge, "Update" button
- Price displays in blue color with currency formatting

---

## ❌ **CURRENT LIMITATION: No Undo Feature**

### ⚠️ **The Problem**
**There is currently NO way to undo or remove an auction price once it's set!**

### What You CANNOT Do:
- ❌ Remove the auction price
- ❌ Clear the "Set for Auction" status
- ❌ Return item to "Pending" status
- ❌ Prevent item from appearing in auction list

### Why This Is a Problem:
1. If you set a wrong price, you can only UPDATE it (not remove it)
2. Once set, the item is marked for auction permanently
3. No way to take an item out of auction consideration
4. Item will appear in the auction items list at `/transactions/auction-items`

---

## ✨ **SOLUTION: How to Add Undo Functionality**

### Option 1: Add a "Remove from Auction" Button

#### Backend Changes Needed:
**File:** `pawn-api/routes/items.js`

Add new endpoint:
```javascript
// Remove auction price (undo auction setting)
router.post('/remove-auction-price', authorizeRoles('administrator', 'admin', 'manager', 'auctioneer'), async (req, res) => {
  try {
    const { itemId } = req.body;
    
    console.log(`🚫 [${new Date().toISOString()}] Removing auction price for item ${itemId} - User: ${req.user.username}`);
    
    // Validate input
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid itemId'
      });
    }
    
    // Update to remove auction price
    const updateResult = await pool.query(`
      UPDATE pawn_items
      SET auction_price = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `, [itemId]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    console.log(`✅ Auction price removed for item ${itemId}`);
    
    res.json({
      success: true,
      message: 'Auction price removed successfully',
      data: {
        itemId: updateResult.rows[0].id
      }
    });
    
  } catch (error) {
    console.error('❌ Error removing auction price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove auction price',
      error: error.message
    });
  }
});
```

#### Frontend Changes Needed:
**File:** `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.ts`

Add method:
```typescript
async removeAuctionPrice(item: ExpiredItem): Promise<void> {
  if (!confirm(`Are you sure you want to remove the auction price for "${item.itemDescription}"? This will return it to pending status.`)) {
    return;
  }
  
  try {
    console.log(`🚫 Removing auction price for item ${item.id}`);
    const apiUrl = 'http://localhost:3000/api/items/remove-auction-price';
    const payload = { itemId: item.id };
    
    const response = await this.http.post<any>(apiUrl, payload).toPromise();
    
    if (response && response.success) {
      console.log(`✅ Auction price removed successfully`);
      
      // Update local data
      item.auctionPrice = undefined;
      item.isSetForAuction = false;
      
      // Reload expired items
      await this.loadExpiredItems();
    } else {
      console.error('❌ Failed to remove auction price:', response?.message);
      alert('Failed to remove auction price. Please try again.');
    }
  } catch (error: any) {
    console.error('❌ Error removing auction price:', error);
    alert('Failed to remove auction price. Please try again.');
  }
}
```

**File:** `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.html`

Update Actions column (around line 167):
```html
<!-- Actions -->
<td class="px-6 py-4">
  <div class="flex gap-2">
    <button
      (click)="openPriceModal(item)"
      class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
      [class]="item.isSetForAuction
        ? 'text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
        : 'text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800'">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path *ngIf="!item.isSetForAuction" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        <path *ngIf="item.isSetForAuction" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
      </svg>
      {{ item.isSetForAuction ? 'Update' : 'Set Price' }}
    </button>
    
    <!-- Add Remove Button (only shown when price is set) -->
    <button
      *ngIf="item.isSetForAuction"
      (click)="removeAuctionPrice(item)"
      class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 transition-colors">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      Remove
    </button>
  </div>
</td>
```

---

## 🔄 Complete Workflow Summary

### Scenario 1: Setting a Price (Current Functionality ✅)
1. Auctioneer views expired items list
2. Finds item with "Pending" status
3. Clicks "Set Price" button
4. Enters auction starting price
5. Clicks "Set Price" in modal
6. ✅ Price saved to database
7. ✅ Item status changes to "Set for Auction"
8. ✅ Item appears in auction items list

### Scenario 2: Updating a Price (Current Functionality ✅)
1. Auctioneer sees item with "Set for Auction" status
2. Clicks "Update" button
3. Changes the auction price in modal
4. Clicks "Set Price"
5. ✅ New price saved
6. ✅ Item remains "Set for Auction"

### Scenario 3: Removing from Auction (MISSING - Need to Implement ❌)
1. Auctioneer wants to undo auction setting
2. ❌ **NO BUTTON EXISTS** - Cannot remove price
3. ❌ **Cannot change status back to "Pending"**
4. ❌ **Item stuck in "Set for Auction" state**
5. ❌ **Cannot prevent item from being auctioned**

**To Fix:** Implement Option 1 above (Add "Remove from Auction" button)

---

## 📊 Database Schema

### `pawn_items` Table (Relevant Columns)
```sql
Column           | Type              | Description
-----------------|-------------------|----------------------------------
id               | INTEGER           | Primary key
transaction_id   | INTEGER           | Foreign key to transactions
category_id      | INTEGER           | Foreign key to categories
description_id   | INTEGER           | Foreign key to descriptions
custom_description | TEXT            | Item description
appraised_value  | DECIMAL(15,2)     | Appraisal amount
loan_amount      | DECIMAL(15,2)     | Loan given
auction_price    | DECIMAL(15,2)     | Auction starting price (nullable)
status           | VARCHAR(50)       | 'in_vault', 'redeemed', etc.
updated_at       | TIMESTAMP         | Last update time
```

### Key Point About `auction_price`
- **NULL** = Not set for auction (shows as "Pending")
- **Has Value** = Set for auction (shows as "Set for Auction")
- **Setting to NULL** = Removes from auction (NOT CURRENTLY POSSIBLE)

---

## 🎯 Quick Reference

### Current Working Features:
- ✅ Display expired items
- ✅ Set auction price
- ✅ Update auction price
- ✅ Visual status indicators
- ✅ Price validation

### Missing Features:
- ❌ Remove auction price
- ❌ Undo auction setting
- ❌ Clear "Set for Auction" status
- ❌ Confirmation dialog before setting price

---

## 📝 Summary

**How expired items are displayed:**
- Query database for items with `expiry_date < today`, `status = 'in_vault'`
- Load via API endpoint `/api/items/expired`
- Display in table with item details, pawner info, and pricing status

**Setting auction prices:**
- Click "Set Price" button
- Enter price in modal
- Saves to database via `/api/items/set-auction-price`
- Item marked as "Set for Auction"

**Undoing auction setting:**
- ⚠️ **NOT POSSIBLE** with current implementation
- Need to add "Remove from Auction" functionality (see Solution section above)

---

**Created:** October 9, 2025  
**Status:** Documentation Complete - Feature Gap Identified
