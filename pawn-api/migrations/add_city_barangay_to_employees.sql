-- Migration: Add city_id and barangay_id to employees table
-- Date: 2025-10-12
-- Description: Add address location fields to employees table for consistency with pawners

-- Add city_id and barangay_id columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_city_id ON employees(city_id);
CREATE INDEX IF NOT EXISTS idx_employees_barangay_id ON employees(barangay_id);

-- Update existing employees to have NULL city_id and barangay_id
-- These will need to be manually updated by admins or set when users update their profiles

COMMENT ON COLUMN employees.city_id IS 'Foreign key to cities table - employee city location';
COMMENT ON COLUMN employees.barangay_id IS 'Foreign key to barangays table - employee barangay location';

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added city_id and barangay_id columns to employees table';
  RAISE NOTICE 'Existing employees will have NULL values - update via profile settings';
END $$;
