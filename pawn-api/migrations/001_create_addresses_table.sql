-- Migration: Create addresses table (Simplified Design)
-- Date: 2025-10-12
-- Description: Create centralized addresses table with city_id, barangay_id, and address_details

-- =============================================
-- Step 1: Create addresses table
-- =============================================

CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  barangay_id INTEGER NOT NULL REFERENCES barangays(id) ON DELETE RESTRICT,
  address_details TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_city_id ON addresses(city_id);
CREATE INDEX IF NOT EXISTS idx_addresses_barangay_id ON addresses(barangay_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_active ON addresses(is_active);

-- Add comments
COMMENT ON TABLE addresses IS 'Centralized address table for employees and pawners';
COMMENT ON COLUMN addresses.city_id IS 'Foreign key to cities table';
COMMENT ON COLUMN addresses.barangay_id IS 'Foreign key to barangays table';
COMMENT ON COLUMN addresses.address_details IS 'Detailed address (street, house number, landmarks, etc.)';

-- =============================================
-- Step 2: Migrate pawners data to addresses table
-- =============================================

-- Insert existing pawner addresses into addresses table
INSERT INTO addresses (city_id, barangay_id, address_details)
SELECT 
  p.city_id, 
  p.barangay_id, 
  COALESCE(
    NULLIF(TRIM(CONCAT_WS(', ', p.house_number, p.street)), ''), 
    'No address details'
  ) as address_details
FROM pawners p
WHERE p.city_id IS NOT NULL 
  AND p.barangay_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM addresses a 
    WHERE a.city_id = p.city_id 
      AND a.barangay_id = p.barangay_id
      AND a.address_details = COALESCE(
        NULLIF(TRIM(CONCAT_WS(', ', p.house_number, p.street)), ''), 
        'No address details'
      )
  );

-- Add address_id column to pawners
ALTER TABLE pawners ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES addresses(id);

-- Update pawners to link with addresses
UPDATE pawners p
SET address_id = a.id
FROM addresses a
WHERE p.city_id = a.city_id
  AND p.barangay_id = a.barangay_id
  AND COALESCE(
    NULLIF(TRIM(CONCAT_WS(', ', p.house_number, p.street)), ''), 
    'No address details'
  ) = a.address_details
  AND p.address_id IS NULL;

-- Add index on address_id
CREATE INDEX IF NOT EXISTS idx_pawners_address_id ON pawners(address_id);

-- =============================================
-- Step 3: Add address_id to employees table
-- =============================================

-- Add address_id column to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES addresses(id);

-- Add index on address_id
CREATE INDEX IF NOT EXISTS idx_employees_address_id ON employees(address_id);

-- Note: Existing employees will have NULL address_id
-- They will need to set their address via profile settings

-- =============================================
-- Step 4: Verification queries
-- =============================================

DO $$
DECLARE
  v_addresses_count INTEGER;
  v_pawners_with_address INTEGER;
  v_pawners_without_address INTEGER;
BEGIN
  -- Count addresses created
  SELECT COUNT(*) INTO v_addresses_count FROM addresses;
  
  -- Count pawners with address
  SELECT COUNT(*) INTO v_pawners_with_address FROM pawners WHERE address_id IS NOT NULL;
  
  -- Count pawners without address
  SELECT COUNT(*) INTO v_pawners_without_address FROM pawners WHERE address_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Created addresses table with % records', v_addresses_count;
  RAISE NOTICE 'Pawners with address: %', v_pawners_with_address;
  RAISE NOTICE 'Pawners without address: %', v_pawners_without_address;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update API routes to use addresses table';
  RAISE NOTICE '2. Update frontend to use new structure';
  RAISE NOTICE '3. After verification, drop old columns from pawners';
  RAISE NOTICE '==============================================';
END $$;

-- =============================================
-- Step 5: (OPTIONAL) Drop old columns after verification
-- =============================================

-- IMPORTANT: Only run these after confirming everything works!
-- Uncomment the following lines when ready:

-- ALTER TABLE pawners DROP COLUMN IF EXISTS house_number;
-- ALTER TABLE pawners DROP COLUMN IF EXISTS street;
-- ALTER TABLE pawners DROP COLUMN IF EXISTS city_id;
-- ALTER TABLE pawners DROP COLUMN IF EXISTS barangay_id;
-- ALTER TABLE pawners DROP COLUMN IF EXISTS province;
-- ALTER TABLE pawners DROP COLUMN IF EXISTS postal_code;

-- ALTER TABLE employees DROP COLUMN IF EXISTS address;

-- RAISE NOTICE 'Old columns dropped successfully!';
