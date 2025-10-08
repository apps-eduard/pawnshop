# Auctioneer Dashboard - Expired Items Loading Guide

## ✅ What Has Been Implemented

### 1. Database Changes
- ✅ Added `auction_price` column to `pawn_items` table
- ✅ Migration file created: `add-auction-price-column.js`
- ✅ Migration successfully executed

### 2. Backend API Endpoints (routes/items.js)
- ✅ `GET /api/items/expired` - Fetches expired pawn items
- ✅ `POST /api/items/set-auction-price` - Sets auction price for items
- ✅ Routes properly ordered (specific routes before /:id)

### 3. Frontend Updates (auctioneer-dashboard.ts)
- ✅ Changed from Observable `.subscribe()` to async/await `.toPromise()`
- ✅ Added comprehensive logging to track data flow
- ✅ Flexible field mapping for database response
- ✅ Proper error handling

## 🔍 How to Debug the Issue

### Step 1: Check Browser Console
Open the auctioneer dashboard and check the browser console (F12) for:

```
🔄 Loading expired items from database...
📦 Raw API Response: {...}
📦 Expired items data: [...]
✅ Successfully loaded X expired items
📦 Mapped expired items: [...]
```

### Step 2: Check API Server Logs
The API server terminal should show:
```
⏰ [timestamp] Fetching expired items - User: admin
✅ Found X expired items
```

### Step 3: Test API Endpoint Directly
Run this PowerShell command:
```powershell
cd "X:\Programming 2025\pawnshop\pawn-api"
.\test-expired-endpoint.ps1
```

### Step 4: Check Database for Expired Items
Run:
```powershell
cd "X:\Programming 2025\pawnshop\pawn-api"
node check-expired-items.js
```

This will show:
- Current date
- Recent active transactions
- Number of expired items
- Details of each expired item

## 🎯 Query Criteria for Expired Items

The system considers items expired when:
1. **Expiry Date**: `transactions.expiry_date < CURRENT_DATE`
2. **Item Status**: `pawn_items.status = 'in_vault'`
3. **Transaction Status**: `transactions.status IN ('active', 'expired')` ⚠️ **UPDATED to include 'expired' status**

## ⚠️ Common Issues

### Issue 1: No Items Showing
**Possible Causes:**
- No transactions have passed their expiry_date yet
- Items are not in 'in_vault' status
- Transactions are not in 'active' status
- API server not running on port 3000

**Solution:**
1. Check database with: `node check-expired-items.js`
2. Verify transaction expiry dates are in the past
3. Check item and transaction statuses

### Issue 2: API Connection Error
**Possible Causes:**
- API server not running
- CORS issues
- Authentication token expired

**Solution:**
1. Restart API server: `cd pawn-api && npm start`
2. Check server is running on http://localhost:3000
3. Re-login to get fresh authentication token

### Issue 3: Empty Response
**Possible Causes:**
- Query filters too restrictive
- Database has no matching records

**Solution:**
- Run `check-expired-items.js` to see actual database state
- Temporarily modify query to remove status filters for testing

## 📝 Code Locations

### Backend
- **API Routes**: `pawn-api/routes/items.js` (lines ~76-141)
- **Migration**: `pawn-api/migrations/add-auction-price-column.js`

### Frontend
- **Component**: `pawn-web/src/app/features/dashboards/auctioneer-dashboard/auctioneer-dashboard.ts`
- **Load Method**: `loadExpiredItems()` (line ~189)
- **Set Price Method**: `setAuctionPrice()` (line ~245)

## 🚀 Next Steps

1. **Open browser console** (F12) when viewing auctioneer dashboard
2. **Look for the loading logs** to see what data is being received
3. **Run database check script** to verify expired items exist
4. **Check API server terminal** for request logs
5. **If no items exist**, you may need to create test data with expired dates

## 📞 Getting Help

If issues persist, provide:
1. Browser console output
2. API server terminal output
3. Output from `check-expired-items.js`
4. Screenshot of auctioneer dashboard

This will help identify exactly where the data flow is breaking.
