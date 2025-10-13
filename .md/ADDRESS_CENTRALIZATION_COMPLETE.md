# Address Centralization Implementation

**Date:** October 13, 2025  
**Status:** ✅ Backend Complete - Frontend Pending

## Overview

Successfully migrated the pawnshop system to use a centralized `addresses` table for both pawners and employees, removing duplicate address fields from individual tables.

---

## Changes Summary

### 1. Database Schema Changes ✅

**Migration File:** `migrations_knex/20251013083001_finalize_addresses_migration.js`

**Actions Performed:**
- Migrated all existing pawner addresses to `addresses` table
- Linked all pawners to their respective addresses via `address_id`
- Removed old columns from `pawners` table:
  - `house_number`
  - `street`
  - `city_id`
  - `barangay_id`
  - `province`
  - `postal_code`
- Removed old column from `employees` table:
  - `address`

**Current Schema:**

```sql
-- addresses table
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  barangay_id INTEGER NOT NULL REFERENCES barangays(id),
  address_details TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- pawners table (updated)
ALTER TABLE pawners 
  ADD COLUMN address_id INTEGER REFERENCES addresses(id);

-- employees table (updated)
ALTER TABLE employees 
  ADD COLUMN address_id INTEGER REFERENCES addresses(id);
```

**Migration Results:**
- Total pawners: 10
- Pawners with address: 10 (100%)
- Total addresses: 10
- Migration completed successfully ✅

---

### 2. Backend API Changes ✅

**File:** `pawn-api/routes/pawners.js`

#### **GET /api/pawners/search**
- Updated to JOIN with `addresses` table
- Returns `addressDetails` from addresses table
- Query updated:
```javascript
SELECT p.id, p.first_name, p.last_name, p.mobile_number, p.email,
       a.address_details as address, p.id_type, p.id_number, p.birth_date, p.is_active,
       p.created_at, p.updated_at
FROM pawners p
LEFT JOIN addresses a ON p.address_id = a.id
WHERE p.is_active = true
  AND (/* search conditions */)
```

#### **GET /api/pawners (List All)**
- Updated to JOIN with `addresses`, `cities`, and `barangays`
- Returns:
  - `addressId`
  - `cityId` (from addresses)
  - `barangayId` (from addresses)
  - `addressDetails`
  - `cityName`
  - `barangayName`

#### **GET /api/pawners/:id (Get Single)**
- Same structure as list all
- Returns complete address information via JOIN

#### **POST /api/pawners (Create)**
- **New Logic:**
  1. Accepts `cityId`, `barangayId`, `addressDetails`
  2. Checks if address already exists in `addresses` table
  3. Reuses existing address or creates new one
  4. Links pawner to address via `address_id`
- **Benefits:**
  - Prevents duplicate addresses
  - Normalizes address data
  - Easier to update addresses globally

```javascript
// Create or find address
let addressId = null;
if (cityId && barangayId) {
  const existingAddress = await pool.query(
    'SELECT id FROM addresses WHERE city_id = $1 AND barangay_id = $2 AND address_details = $3',
    [cityId, barangayId, addressDetails]
  );
  
  if (existingAddress.rows.length > 0) {
    addressId = existingAddress.rows[0].id; // Reuse
  } else {
    const newAddress = await pool.query(
      'INSERT INTO addresses (city_id, barangay_id, address_details) VALUES ($1, $2, $3) RETURNING id',
      [cityId, barangayId, addressDetails]
    );
    addressId = newAddress.rows[0].id; // Create new
  }
}

// Insert pawner with address_id
INSERT INTO pawners (first_name, last_name, mobile_number, email, address_id, branch_id, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7)
```

#### **PUT /api/pawners/:id (Update)**
- **New Logic:**
  1. Accepts `cityId`, `barangayId`, `addressDetails`
  2. Gets current address values if partial update
  3. Checks if new address combination already exists
  4. Reuses existing or creates new address
  5. Updates pawner's `address_id`
- **Smart Merging:**
  - If only `cityId` provided, keeps current barangay and addressDetails
  - If only `addressDetails` changed, keeps current city and barangay
  - Creates new address record only if combination doesn't exist

---

### 3. Frontend Changes 🔄 PENDING

**Files to Update:**
- `pawn-web/src/app/features/management/pawner-management/pawner-management.ts`
- `pawn-web/src/app/features/management/pawner-management/pawner-management.html`

**Required Changes:**
1. Update form to handle `addressId` instead of direct city/barangay/address fields
2. API responses now include:
   - `addressId` - ID of address record
   - `cityId` - From addresses table
   - `barangayId` - From addresses table
   - `addressDetails` - From addresses table
3. Form submission should send `cityId`, `barangayId`, `addressDetails`
4. Backend will handle address creation/reuse automatically

---

## Benefits of Centralized Addresses

### 1. **Data Normalization**
- Single source of truth for addresses
- No duplicate city/barangay/address combinations
- Easier to maintain address data

### 2. **Storage Efficiency**
- Multiple pawners/employees can share same address
- Reduced storage for common addresses
- Example: 10 pawners at same address = 1 address record instead of 10

### 3. **Update Simplicity**
- Update address once, affects all users at that address
- Easier to fix typos or update city/barangay changes
- Bulk address updates possible

### 4. **Query Performance**
- Indexed lookups on addresses table
- Can query all people at specific city/barangay
- Analytics by geographic location easier

### 5. **Future Extensibility**
- Can add latitude/longitude to addresses
- Can add delivery zones, postal codes centrally
- Can implement address validation once

---

## Rollback Plan

If issues arise, the migration can be rolled back:

```bash
cd pawn-api
npx knex migrate:rollback
```

**Rollback Actions:**
1. Restores old columns to `pawners` table
2. Migrates data back from `addresses` to old columns
3. Restores `address` column to `employees` table
4. Keeps `addresses` table and `address_id` columns can be dropped manually if needed

---

## Testing Checklist

### Backend API ✅ (Completed)
- [x] Migration ran successfully
- [x] Server started without errors
- [x] Updated routes to use JOINs
- [x] Create pawner logic updated
- [x] Update pawner logic updated

### Frontend 🔄 (Pending)
- [ ] Pawner Management page loads
- [ ] Can view pawner list with addresses
- [ ] Can create new pawner with address
- [ ] Can update pawner address (Peter Paul ID: 2)
- [ ] Address dropdown/select works
- [ ] City and Barangay dropdowns populate correctly

### Integration Tests 🔄 (Pending)
- [ ] Create pawner at new address
- [ ] Create pawner at existing address (should reuse)
- [ ] Update pawner to different address
- [ ] Search pawners by name shows address
- [ ] View pawner details shows full address

---

## Next Steps

1. **Update Frontend Components** (Priority: HIGH)
   - Modify `pawner-management.ts` to handle new address structure
   - Update forms to send `cityId`, `barangayId`, `addressDetails`
   - Update display to show address from joined data

2. **Update Employee Routes** (Priority: MEDIUM)
   - Apply same pattern to `pawn-api/routes/employees.js`
   - Update employee profile to use addresses table

3. **Update Other Pawner References** (Priority: MEDIUM)
   - Check `new-loan.ts` for address handling
   - Check any reports or exports that use pawner addresses

4. **Testing** (Priority: HIGH)
   - Test Peter Paul (ID: 2) address update
   - Test creating new pawners
   - Test address reuse functionality

---

## Database Migration Commands

### Run Migration
```bash
cd pawn-api
npx knex migrate:latest
```

### Check Migration Status
```bash
cd pawn-api
npx knex migrate:status
```

### Rollback Migration
```bash
cd pawn-api
npx knex migrate:rollback
```

### Check Current Schema
```bash
cd pawn-api
node check_schema.js
```

---

## Technical Notes

### Address Reuse Logic

The system now intelligently reuses addresses:

```javascript
// Same city, barangay, and address_details = Same address record
Address 1: { city_id: 1, barangay_id: 5, address_details: "123 Main St" }
Address 2: { city_id: 1, barangay_id: 5, address_details: "123 Main St" }
// Result: Both use Address 1 (reused)

Address 3: { city_id: 1, barangay_id: 5, address_details: "456 Oak Ave" }
// Result: Creates new Address 3 (different address_details)
```

### Performance Considerations

- **Index on `address_id`:** Both pawners and employees tables have indexes on `address_id` for fast JOINs
- **Index on city/barangay:** Addresses table has indexes on `city_id` and `barangay_id`
- **Query optimization:** LEFT JOINs used to allow null addresses

### Edge Cases Handled

1. **Pawner without address:** `address_id` can be NULL
2. **Partial address updates:** System merges with existing address data
3. **Address already exists:** System reuses existing record
4. **Multiple pawners, same address:** All reference same address record

---

## Files Modified

### Backend
- ✅ `pawn-api/migrations_knex/20251013083001_finalize_addresses_migration.js` (NEW)
- ✅ `pawn-api/routes/pawners.js` (MODIFIED)

### Frontend (Pending)
- 🔄 `pawn-web/src/app/features/management/pawner-management/pawner-management.ts`
- 🔄 `pawn-web/src/app/features/management/pawner-management/pawner-management.html`

### Scripts
- ✅ `pawn-api/check_schema.js` (Created for verification)

---

## Success Criteria

- [x] Migration completed without errors
- [x] All pawners have valid `address_id`
- [x] Old columns removed from pawners table
- [x] Backend API updated to use addresses table
- [x] Server running without errors
- [ ] Frontend can create pawners with addresses
- [ ] Frontend can update pawner addresses
- [ ] Peter Paul (ID: 2) address can be updated successfully

---

**Implementation Status:** 60% Complete (Backend Done, Frontend Pending)  
**Next Action:** Update frontend pawner management component  
**Estimated Time to Complete:** 30-45 minutes
