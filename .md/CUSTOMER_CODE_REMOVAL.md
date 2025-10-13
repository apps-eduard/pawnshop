# Customer Code Removal - System Simplification

## Decision
Remove `customer_code` (CUST000123) from the system and rely on database `id` and phone numbers for customer identification.

## Rationale

### Problems with Customer Code:
- ❌ Limited capacity: `CUST000001` to `CUST999999` = only 999,999 customers
- ❌ Would break at 1 million customers
- ❌ Adds unnecessary complexity
- ❌ Not actually useful for customer service (people remember names/phones, not codes)
- ❌ Old pawners in database have `NULL` customer codes

### Benefits of Removal:
- ✅ Simpler system
- ✅ No arbitrary limits
- ✅ Database `id` has 2.1 billion capacity (never runs out)
- ✅ Phone numbers are what customers actually remember
- ✅ Less confusing for staff
- ✅ Allows multiple customers to share phone (family members)

## What We're Keeping

### Database IDs (Internal Use)
- **Type:** PostgreSQL INTEGER (auto-increment)
- **Capacity:** 2,147,483,647 (2.1 billion)
- **Usage:** Database relationships, internal tracking
- **Never shown to customers**

### Transaction Numbers (User-Facing)
- **Format:** `TXN-202510-000001`
- **Components:** Prefix + Year + Month + Sequence
- **Capacity:** 999,999 per month (unlimited with monthly reset)
- **Usage:** Receipts, invoices, customer references

### Customer Identification By:
1. **Name** - "Samuel Smith"
2. **Phone Number** - "09171234567"
3. **Database ID** - Internal only

## Files Modified

### 1. Database Migration
**File:** `pawn-api/migrations_knex/20251007072721_create_core_pawnshop_tables.js`

**Removed:**
```javascript
table.string('customer_code', 20).unique();
```

**Impact:** New database won't have `customer_code` column in `pawners` table.

### 2. Backend - Auction Sale Buyer Creation
**File:** `pawn-api/routes/items.js` (Lines 885-920)

**Removed:**
- Customer code generation query (11 lines)
- `customer_code` from INSERT statement
- Customer code logging

**Before:**
```javascript
// Generate customer code
const codeResult = await client.query(`...`);
const customerCode = `CUST${String(nextCode).padStart(6, '0')}`;

INSERT INTO pawners (customer_code, first_name, ...) 
VALUES ($1, $2, ...)
```

**After:**
```javascript
INSERT INTO pawners (first_name, last_name, ...) 
VALUES ($1, $2, ...)
```

### 3. Backend - Pawners Search API
**File:** `pawn-api/routes/pawners.js` (Lines 40-75)

**Removed:**
- `customer_code` from SELECT query
- `customer_code` from search WHERE clause
- `customerCode` from response mapping
- Customer code from console logs

**Before:**
```sql
SELECT p.id, p.customer_code, p.first_name, ... 
WHERE ... OR LOWER(p.customer_code) LIKE LOWER($1) ...
```

**After:**
```sql
SELECT p.id, p.first_name, p.last_name, ...
WHERE ... (no customer_code search)
```

### 4. Backend - Sold Items Query
**File:** `pawn-api/routes/items.js` (Lines 440-490)

**Removed:**
- `buyer.customer_code` from SELECT
- `buyerCode` from response mapping

### 5. Backend - Transaction Reports
**File:** `pawn-api/routes/reports.js` (Line 50)

**Removed:**
```sql
p.customer_code,
```

### 6. Frontend - Auction Items Dialog
**File:** `pawn-web/src/app/features/transactions/auction-items/auction-items.html` (Line 469)

**Before:**
```html
{{ buyer.contactNumber || 'No contact' }} • Id: {{ buyer.customerCode }}
```

**After:**
```html
{{ buyer.contactNumber || 'No contact' }}
```

**Impact:** Search results now only show name and phone number.

### 7. Frontend - Sales Report
**File:** `pawn-web/src/app/features/transactions/sales-report/sales-report.component.html` (Line 252)

**Before:**
```html
<div class="text-xs">{{ item.buyerCode }}</div>
```

**After:**
```html
<div class="text-xs">{{ item.buyerContact }}</div>
```

**Impact:** Shows buyer phone number instead of customer code.

## Testing Checklist

### After Database Recreation:

#### Auction Items:
- [ ] Open Auction Items page
- [ ] Click "Sell" on an item
- [ ] Search for existing customer
- [ ] Verify search results show: Name + Phone (no customer code)
- [ ] Select existing customer
- [ ] Complete sale successfully
- [ ] Create new customer buyer
- [ ] Verify new pawner created without customer_code error

#### Sales Report:
- [ ] Open Sales Report page
- [ ] Verify buyer column shows name + phone (not customer code)
- [ ] Verify no "N/A" or blank customer codes

#### New Loan:
- [ ] Search for pawner
- [ ] Verify search results show name + phone only
- [ ] Select pawner successfully

#### Backend:
- [ ] Check pawners table has no `customer_code` column
- [ ] Verify new buyers can be created in auction sales
- [ ] Check console logs don't reference customer codes

## Database Recreation Steps

```bash
# 1. Stop the API server
cd pawn-api

# 2. Drop existing database (CAUTION: All data will be lost)
psql -U postgres
DROP DATABASE pawnshop;
CREATE DATABASE pawnshop;
\q

# 3. Run migrations
npx knex migrate:latest

# 4. Run seeds (if any)
npx knex seed:run

# 5. Start API server
npm start

# 6. Test the changes
```

## Rollback Plan (If Needed)

If you need to restore customer_code functionality:

1. Add `customer_code` column back to migration
2. Restore removed code sections (search this file for "Removed:")
3. Recreate database with updated migration
4. Generate customer codes for existing pawners:

```sql
UPDATE pawners 
SET customer_code = 'CUST' || LPAD(id::text, 8, '0')
WHERE customer_code IS NULL;
```

## Future Considerations

### What If We Need Customer Codes Later?

If business requirements change and customer codes become necessary:

1. **Option A:** Re-add with 8-digit format
   - `CUST00000001` to `CUST99999999` (99 million capacity)

2. **Option B:** Use database ID as display code
   - Show as: `ID-00001234` (format the id for display)
   - No separate column needed
   - Infinite capacity

3. **Option C:** Use UUID
   - Generate unique codes: `CUST-a7b2c3d4`
   - Truly unlimited

## Summary

✅ **Removed:** Customer code generation and display  
✅ **Simplified:** Customer identification now uses Name + Phone + ID  
✅ **Capacity:** No more 999,999 customer limit  
✅ **Cleaner:** Less code, simpler system  
✅ **Database:** Migration updated for fresh installations  

**Status:** Ready for database recreation  
**Date:** October 13, 2025
