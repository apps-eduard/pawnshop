# Auction Sale Buyer Management Implementation

## Overview
Enhanced the auction sale feature to properly manage buyer information using the existing `pawners` table with search functionality and the ability to add new customers.

## Database Changes

### Migration: `20251012133800_add_auction_sale_columns.js`
Added columns to `pawn_items` table:
- `buyer_id` (FK to pawners) - References the pawner who purchased the item
- `discount_amount` - Discount applied to auction price
- `final_price` - Final sale price after discount
- `received_amount` - Amount received from buyer
- `sale_notes` - Additional notes about the sale

**Key Design Decision**: Uses `buyer_id` foreign key to `pawners` table instead of storing buyer_name/buyer_contact as separate text fields. This ensures:
- Data normalization
- Referential integrity
- Ability to track purchase history per customer
- Reuse of existing customer records

## Backend Changes

### 1. Pawner Search Endpoint
**Existing endpoint** (already implemented in `routes/pawners.js`):
```
GET /api/pawners/search?q={query}
```
- Searches by first name, last name, or mobile number
- Returns active pawners only
- Case-insensitive partial matching

### 2. Updated Auction Sale Confirmation
**Endpoint**: `POST /api/items/for-auction/confirm-sale`

**New Request Body**:
```javascript
{
  itemId: number,
  buyerId: number | null,        // null if new customer
  buyerFirstName: string,         // Required if buyerId is null
  buyerLastName: string,          // Required if buyerId is null
  buyerContact: string | null,    // Optional
  saleNotes: string | null,       // Optional
  discountAmount: number,         // Optional, defaults to 0
  finalPrice: number,             // Required
  receivedAmount: number          // Optional, defaults to 0
}
```

**Process Flow**:
1. Validate item availability
2. If `buyerId` is null (new customer):
   - Generate new customer code (CUST######)
   - Create new pawner record with first_name, last_name, mobile_number
   - Use the new pawner ID
3. If `buyerId` is provided:
   - Use existing pawner record
4. Update `pawn_items` with buyer_id, sale details, and mark as 'sold'
5. Close related transaction if active

## Frontend Changes

### 1. Component Updates (`auction-items.component.ts`)

**New Properties**:
```typescript
isNewCustomer: boolean = false;           // Toggle between search and new customer form
buyerSearchQuery: string = '';            // Search input value
searchResults: any[] = [];                // Search results from API
selectedBuyer: any = null;                // Selected buyer from search
isSearching: boolean = false;             // Loading state during search
showSearchResults: boolean = false;       // Control search dropdown visibility
buyerFirstName: string = '';              // For new customer
buyerLastName: string = '';               // For new customer
buyerContact: string = '';                // For new/existing customer
```

**New Methods**:
- `searchBuyers()` - Searches for pawners as user types (min 2 characters)
- `selectBuyer(buyer)` - Selects a buyer from search results
- `showNewCustomerForm()` - Switches to new customer entry mode
- `cancelNewCustomer()` - Returns to search mode

**Updated Methods**:
- `confirmSale()` - Now handles both existing and new customers
  - Validates based on mode (search vs new)
  - Sends buyer_id OR firstName/lastName
  - Backend creates pawner if needed

### 2. Template Updates (`auction-items.html`)

**Buyer Information Section** - Dynamic UI with two modes:

#### Mode 1: Search Existing Customer (Default)
- Search input box with icon
- Real-time search (debounced)
- Dropdown showing search results with:
  - Full name
  - Contact number
  - Customer code
- Selected buyer display card with remove button
- "New Customer" button to switch modes

#### Mode 2: New Customer Entry
- Header showing "Adding New Customer" with Cancel button
- Three-column form:
  - First Name * (required)
  - Last Name * (required)
  - Contact Number (optional)
- Blue highlight to indicate new customer mode

### 3. Service Updates (`item.service.ts`)

**New Method**:
```typescript
async searchPawners(query: string): Promise<ApiResponse<any>>
```
- Calls `GET /api/pawners/search?q={query}`
- Returns array of matching pawner records

**Updated Method**:
```typescript
confirmAuctionSale(saleData)
```
- Now accepts: buyerId, buyerFirstName, buyerLastName, buyerContact
- No longer sends: buyerName (split into first/last), changeAmount (calculated client-side)

## User Flow

### Scenario 1: Existing Customer
1. User clicks "Process Sale" on auction item
2. Modal opens with search box
3. User types customer name or phone number
4. Search results appear in dropdown
5. User clicks on matching customer
6. Customer info displays in green card
7. User enters discount/payment details
8. Clicks "Confirm Sale"
9. Backend uses existing pawner ID

### Scenario 2: New Customer
1. User clicks "Process Sale" on auction item
2. Modal opens with search box
3. User clicks "New Customer" button
4. Form switches to 3-column input (First Name, Last Name, Contact)
5. User enters new customer details
6. User enters discount/payment details
7. Clicks "Confirm Sale"
8. Backend creates new pawner record and uses new ID

### Scenario 3: Search Then Switch to New
1. User searches but doesn't find customer
2. Clicks "New Customer" button
3. Form switches to entry mode
4. Can click "Cancel" to return to search mode

## Benefits

1. **Data Integrity**: Buyer information stored in normalized `pawners` table
2. **Reusability**: Existing customers can be quickly selected from search
3. **History Tracking**: Can query purchase history via buyer_id foreign key
4. **Flexible**: Supports both walk-in new customers and returning customers
5. **User Friendly**: Search-first design with easy escape to manual entry
6. **Professional**: Proper customer management like modern POS systems

## Database Schema

```sql
-- pawn_items table (relevant columns)
buyer_id INTEGER REFERENCES pawners(id) ON DELETE SET NULL
discount_amount DECIMAL(15,2) DEFAULT 0
final_price DECIMAL(15,2)
received_amount DECIMAL(15,2) DEFAULT 0
sale_notes TEXT
sold_date DATE

-- pawners table (used for buyers)
id SERIAL PRIMARY KEY
customer_code VARCHAR(20) UNIQUE
first_name VARCHAR(50) NOT NULL
last_name VARCHAR(50) NOT NULL
mobile_number VARCHAR(20)
-- ... other customer details
```

## Testing Checklist

- [x] Migration applied successfully
- [ ] Search existing pawners works
- [ ] Select pawner from search populates form
- [ ] New customer creates pawner record
- [ ] Sale confirmation with existing customer succeeds
- [ ] Sale confirmation with new customer succeeds
- [ ] Transaction status updates to 'closed'
- [ ] Item removed from auction list after sale
- [ ] Toast notifications show correct buyer name
- [ ] Search handles no results gracefully
- [ ] Search handles minimum character requirement
- [ ] Cancel new customer returns to search mode
- [ ] Remove selected buyer works
- [ ] Discount and payment calculations work correctly

## Files Modified

### Backend
1. `migrations_knex/20251012133800_add_auction_sale_columns.js` - New migration
2. `routes/items.js` - Updated `/for-auction/confirm-sale` endpoint
3. `routes/pawners.js` - Search endpoint (already existed)

### Frontend
1. `app/features/transactions/auction-items/auction-items.component.ts` - Added search logic
2. `app/features/transactions/auction-items/auction-items.html` - New buyer UI
3. `app/core/services/item.service.ts` - Added searchPawners method

## Notes

- Change amount removed from database (calculated on frontend only for display)
- Customer code auto-generated as CUST###### for new buyers
- Search requires minimum 2 characters to prevent excessive queries
- buyer_id allows ON DELETE SET NULL to preserve sale records even if customer deleted
- created_by and updated_by track which employee added the buyer

---

**Implementation Date**: October 12, 2025
**Status**: ✅ Complete - Ready for Testing
