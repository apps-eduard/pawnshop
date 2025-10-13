# Address Table Implementation - Proper Database Design

**Date:** October 12, 2025  
**Status:** ✅ RECOMMENDED APPROACH

---

## Current vs Proposed Design

### ❌ Current Design (Not Ideal)
```
pawners table:
- house_number
- street
- city_id (FK)
- barangay_id (FK)
- province
- postal_code

employees table:
- address (TEXT)
- (no city_id, barangay_id)
```

**Problems:**
- Inconsistent structure between pawners and employees
- Address data duplicated across tables
- Hard to query by location
- Province and postal_code in pawners but not in employees

---

## ✅ Proposed Design (Best Practice)

### New Table Structure

```sql
-- addresses table (centralized address management)
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  house_number VARCHAR(20),
  street VARCHAR(100),
  barangay_id INTEGER NOT NULL REFERENCES barangays(id),
  city_id INTEGER NOT NULL REFERENCES cities(id),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  address_details TEXT,  -- Additional notes/landmarks
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_barangay_id ON addresses(barangay_id);
CREATE INDEX idx_addresses_city_id ON addresses(city_id);
CREATE INDEX idx_addresses_is_active ON addresses(is_active);

-- pawners table (modified)
ALTER TABLE pawners 
DROP COLUMN house_number,
DROP COLUMN street,
DROP COLUMN city_id,
DROP COLUMN barangay_id,
DROP COLUMN province,
DROP COLUMN postal_code,
ADD COLUMN address_id INTEGER REFERENCES addresses(id);

CREATE INDEX idx_pawners_address_id ON pawners(address_id);

-- employees table (modified)
ALTER TABLE employees 
DROP COLUMN address,
ADD COLUMN address_id INTEGER REFERENCES addresses(id);

CREATE INDEX idx_employees_address_id ON employees(address_id);
```

---

## Benefits

### 1. **Single Source of Truth**
- One address record can be shared if needed (e.g., family members at same address)
- Address updates in one place affect all references

### 2. **Consistency**
- Pawners and employees use the same address structure
- Standardized address format across the system

### 3. **Easier Queries**
```sql
-- Get all employees in a specific city (easy with addresses table)
SELECT e.*, a.*, c.name as city_name, b.name as barangay_name
FROM employees e
JOIN addresses a ON e.address_id = a.id
JOIN cities c ON a.city_id = c.id
JOIN barangays b ON a.barangay_id = b.id
WHERE c.id = 1;

-- Get all customers and employees in the same barangay
SELECT 'pawner' as type, p.first_name, p.last_name
FROM pawners p
JOIN addresses a ON p.address_id = a.id
WHERE a.barangay_id = 10
UNION
SELECT 'employee' as type, e.first_name, e.last_name
FROM employees e
JOIN addresses a ON e.address_id = a.id
WHERE a.barangay_id = 10;
```

### 4. **Data Integrity**
- Foreign key constraints ensure valid addresses
- Cascading rules can be set for updates/deletes
- Can add validation rules at address level

### 5. **Audit Trail**
- Track address changes separately
- Keep history of address updates
- Know when addresses were created/modified

### 6. **Scalability**
- Easy to add address-related features (geocoding, distance calc)
- Can add address verification/validation
- Can implement address sharing if needed

---

## Migration Strategy

### Phase 1: Create addresses table
```sql
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  house_number VARCHAR(20),
  street VARCHAR(100),
  barangay_id INTEGER NOT NULL REFERENCES barangays(id),
  city_id INTEGER NOT NULL REFERENCES cities(id),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  address_details TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_barangay_id ON addresses(barangay_id);
CREATE INDEX idx_addresses_city_id ON addresses(city_id);
```

### Phase 2: Migrate pawners data
```sql
-- Insert pawner addresses into addresses table
INSERT INTO addresses (house_number, street, barangay_id, city_id, province, postal_code)
SELECT house_number, street, barangay_id, city_id, province, postal_code
FROM pawners
WHERE barangay_id IS NOT NULL AND city_id IS NOT NULL;

-- Add address_id column to pawners
ALTER TABLE pawners ADD COLUMN address_id INTEGER REFERENCES addresses(id);

-- Update pawners with their address_id
UPDATE pawners p
SET address_id = a.id
FROM addresses a
WHERE p.house_number = a.house_number
  AND p.street = a.street
  AND p.barangay_id = a.barangay_id
  AND p.city_id = a.city_id;

-- Drop old columns (after verifying data migration)
ALTER TABLE pawners 
DROP COLUMN house_number,
DROP COLUMN street,
DROP COLUMN city_id,
DROP COLUMN barangay_id,
DROP COLUMN province,
DROP COLUMN postal_code;
```

### Phase 3: Migrate employees data
```sql
-- For employees with existing address text, create address records
-- (This would need manual review as it's unstructured TEXT)

-- Add address_id column to employees
ALTER TABLE employees ADD COLUMN address_id INTEGER REFERENCES addresses(id);

-- Drop old address column (after migrating important data)
ALTER TABLE employees DROP COLUMN address;
```

---

## API Changes

### New Addresses Endpoint
```javascript
// routes/addresses.js

// Create new address
router.post('/', async (req, res) => {
  const { houseNumber, street, barangayId, cityId, province, postalCode, addressDetails } = req.body;
  
  const result = await pool.query(`
    INSERT INTO addresses (house_number, street, barangay_id, city_id, province, postal_code, address_details)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, house_number, street, barangay_id, city_id, province, postal_code, address_details
  `, [houseNumber, street, barangayId, cityId, province, postalCode, addressDetails]);
  
  res.json({ success: true, data: result.rows[0] });
});

// Get address with city/barangay names
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT a.*, 
           c.name as city_name, 
           b.name as barangay_name
    FROM addresses a
    LEFT JOIN cities c ON a.city_id = c.id
    LEFT JOIN barangays b ON a.barangay_id = b.id
    WHERE a.id = $1
  `, [id]);
  
  res.json({ success: true, data: result.rows[0] });
});

// Update address
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { houseNumber, street, barangayId, cityId, province, postalCode, addressDetails } = req.body;
  
  const result = await pool.query(`
    UPDATE addresses 
    SET house_number = $1, street = $2, barangay_id = $3, city_id = $4, 
        province = $5, postal_code = $6, address_details = $7, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `, [houseNumber, street, barangayId, cityId, province, postalCode, addressDetails, id]);
  
  res.json({ success: true, data: result.rows[0] });
});
```

### Updated Pawners Endpoint
```javascript
// routes/pawners.js

// Get all pawners with address information
router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, 
           a.house_number, a.street, a.province, a.postal_code, a.address_details,
           c.name as city_name, 
           b.name as barangay_name
    FROM pawners p
    LEFT JOIN addresses a ON p.address_id = a.id
    LEFT JOIN cities c ON a.city_id = c.id
    LEFT JOIN barangays b ON a.barangay_id = b.id
    ORDER BY p.created_at DESC
  `);
  
  res.json({ success: true, data: result.rows });
});

// Create pawner with address
router.post('/', async (req, res) => {
  const { firstName, lastName, ..., address } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create address first
    const addressResult = await client.query(`
      INSERT INTO addresses (house_number, street, barangay_id, city_id, province, postal_code, address_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [address.houseNumber, address.street, address.barangayId, address.cityId, 
        address.province, address.postalCode, address.addressDetails]);
    
    const addressId = addressResult.rows[0].id;
    
    // Create pawner with address_id
    const pawnerResult = await client.query(`
      INSERT INTO pawners (first_name, last_name, ..., address_id)
      VALUES ($1, $2, ..., $n)
      RETURNING *
    `, [firstName, lastName, ..., addressId]);
    
    await client.query('COMMIT');
    res.json({ success: true, data: pawnerResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
```

### Updated Users Endpoint
```javascript
// routes/users.js

// Get all users with address information
router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT e.*, 
           a.house_number, a.street, a.province, a.postal_code, a.address_details,
           c.name as city_name, 
           b.name as barangay_name,
           br.name as branch_name
    FROM employees e
    LEFT JOIN addresses a ON e.address_id = a.id
    LEFT JOIN cities c ON a.city_id = c.id
    LEFT JOIN barangays b ON a.barangay_id = b.id
    LEFT JOIN branches br ON e.branch_id = br.id
    ORDER BY e.created_at DESC
  `);
  
  res.json({ success: true, data: result.rows });
});
```

---

## Frontend Changes

### Models/Interfaces
```typescript
export interface Address {
  id: number;
  houseNumber?: string;
  street?: string;
  barangayId: number;
  cityId: number;
  province?: string;
  postalCode?: string;
  addressDetails?: string;
  cityName?: string;
  barangayName?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Pawner {
  id: number;
  firstName: string;
  lastName: string;
  // ... other fields
  addressId?: number;
  // For display purposes (from JOIN)
  houseNumber?: string;
  street?: string;
  cityName?: string;
  barangayName?: string;
  addressDetails?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  // ... other fields
  addressId?: number;
  // For display purposes (from JOIN)
  cityName?: string;
  barangayName?: string;
  addressDetails?: string;
}
```

### Address Service
```typescript
@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private apiUrl = `${environment.apiUrl}/addresses`;

  createAddress(address: Partial<Address>): Observable<any> {
    return this.http.post(`${this.apiUrl}`, address);
  }

  getAddress(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateAddress(id: number, address: Partial<Address>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, address);
  }

  deleteAddress(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
```

---

## Implementation Steps

### ✅ Step 1: Create addresses table
Run migration SQL to create the new table

### ✅ Step 2: Update backend routes
- Create addresses CRUD endpoints
- Update pawners routes to use addresses table
- Update users routes to use addresses table

### ✅ Step 3: Migrate existing data
- Export current address data
- Import into addresses table
- Update foreign keys

### ✅ Step 4: Update frontend
- Create address service
- Update pawner/user forms to use address service
- Update display components

### ✅ Step 5: Test thoroughly
- Test creating new pawners/employees with addresses
- Test updating addresses
- Test queries and reports
- Verify data integrity

### ✅ Step 6: Drop old columns
- After verifying everything works
- Backup database first!
- Drop redundant columns

---

## Rollback Plan

If issues arise:

1. **Keep old columns temporarily** during migration
2. **Run both systems in parallel** for verification
3. **Have database backup** before dropping columns
4. **Can revert to old structure** if needed

---

## Alternative: Keep Current Structure

If you prefer not to do full migration now:

### Quick Fix Option
```sql
-- Just add city_id and barangay_id to employees
ALTER TABLE employees 
ADD COLUMN city_id INTEGER REFERENCES cities(id),
ADD COLUMN barangay_id INTEGER REFERENCES barangays(id);

-- Update backend to include these fields
-- Keep the rest of current structure
```

This gives you consistency without the full addresses table migration.

---

## Recommendation

**I recommend implementing the addresses table approach** because:

1. ✅ Industry best practice
2. ✅ Better data normalization
3. ✅ Easier to maintain long-term
4. ✅ More flexible for future features
5. ✅ Cleaner code structure

**But if time is limited**, the quick fix (adding city_id/barangay_id to employees) will work for now and can be migrated to addresses table later.

---

## Decision

What would you like to do?

- **Option A:** Full addresses table implementation (best practice, takes time)
- **Option B:** Quick fix - add city_id/barangay_id to employees (faster, less ideal)

Let me know and I'll implement your choice! 🚀
