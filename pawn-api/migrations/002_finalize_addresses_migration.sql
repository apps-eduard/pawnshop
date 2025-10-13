-- Migration: Finalize addresses table migration
-- Date: 2025-10-13
-- Description: Complete migration to centralized addresses table and remove old columns

-- =============================================
-- Step 1: Ensure all pawners have addresses
-- =============================================

DO $$
DECLARE
  v_pawner RECORD;
  v_address_id INTEGER;
BEGIN
  -- Loop through pawners without address_id
  FOR v_pawner IN 
    SELECT id, city_id, barangay_id, house_number, street
    FROM pawners 
    WHERE address_id IS NULL
      AND city_id IS NOT NULL
      AND barangay_id IS NOT NULL
  LOOP
    -- Try to find existing address
    SELECT id INTO v_address_id
    FROM addresses
    WHERE city_id = v_pawner.city_id
      AND barangay_id = v_pawner.barangay_id
      AND address_details = COALESCE(
        NULLIF(TRIM(CONCAT_WS(', ', v_pawner.house_number, v_pawner.street)), ''), 
        'No address details'
      );
    
    -- If not found, create new address
    IF v_address_id IS NULL THEN
      INSERT INTO addresses (city_id, barangay_id, address_details)
      VALUES (
        v_pawner.city_id,
        v_pawner.barangay_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(', ', v_pawner.house_number, v_pawner.street)), ''), 
          'No address details'
        )
      )
      RETURNING id INTO v_address_id;
    END IF;
    
    -- Update pawner with address_id
    UPDATE pawners SET address_id = v_address_id WHERE id = v_pawner.id;
  END LOOP;
  
  RAISE NOTICE 'All pawners now have address_id set';
END $$;

-- =============================================
-- Step 2: Migrate employee addresses (if any exist)
-- =============================================

DO $$
DECLARE
  v_employee RECORD;
  v_address_id INTEGER;
BEGIN
  -- Loop through employees with old address field
  FOR v_employee IN 
    SELECT id, address
    FROM employees 
    WHERE address_id IS NULL
      AND address IS NOT NULL
      AND TRIM(address) != ''
  LOOP
    -- Create new address (we'll use a default city/barangay or NULL)
    -- Note: Employees might need to update their addresses properly
    INSERT INTO addresses (city_id, barangay_id, address_details, is_active)
    VALUES (
      1, -- Default city (adjust as needed)
      1, -- Default barangay (adjust as needed)
      v_employee.address,
      true
    )
    RETURNING id INTO v_address_id;
    
    -- Update employee with address_id
    UPDATE employees SET address_id = v_address_id WHERE id = v_employee.id;
  END LOOP;
  
  RAISE NOTICE 'Employee addresses migrated';
END $$;

-- =============================================
-- Step 3: Drop old address columns from pawners
-- =============================================

-- Drop old address columns from pawners table
ALTER TABLE pawners DROP COLUMN IF EXISTS house_number;
ALTER TABLE pawners DROP COLUMN IF EXISTS street;
ALTER TABLE pawners DROP COLUMN IF EXISTS city_id;
ALTER TABLE pawners DROP COLUMN IF EXISTS barangay_id;
ALTER TABLE pawners DROP COLUMN IF EXISTS province;
ALTER TABLE pawners DROP COLUMN IF EXISTS postal_code;

RAISE NOTICE 'Removed old address columns from pawners table';

-- =============================================
-- Step 4: Drop old address column from employees
-- =============================================

-- Drop old address column from employees table
ALTER TABLE employees DROP COLUMN IF EXISTS address;

RAISE NOTICE 'Removed old address column from employees table';

-- =============================================
-- Step 5: Make address_id NOT NULL (optional)
-- =============================================

-- Uncomment these lines if you want to enforce address_id
-- ALTER TABLE pawners ALTER COLUMN address_id SET NOT NULL;
-- ALTER TABLE employees ALTER COLUMN address_id SET NOT NULL;

-- =============================================
-- Step 6: Verification
-- =============================================

DO $$
DECLARE
  v_total_pawners INTEGER;
  v_pawners_with_address INTEGER;
  v_addresses_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_pawners FROM pawners;
  SELECT COUNT(*) INTO v_pawners_with_address FROM pawners WHERE address_id IS NOT NULL;
  SELECT COUNT(*) INTO v_addresses_count FROM addresses;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total pawners: %', v_total_pawners;
  RAISE NOTICE 'Pawners with address: %', v_pawners_with_address;
  RAISE NOTICE 'Total addresses: %', v_addresses_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Old columns removed from:';
  RAISE NOTICE '  - pawners: house_number, street, city_id, barangay_id, province, postal_code';
  RAISE NOTICE '  - employees: address';
  RAISE NOTICE '==============================================';
END $$;
