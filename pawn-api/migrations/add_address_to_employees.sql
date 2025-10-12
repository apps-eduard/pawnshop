-- Migration: Add address fields to employees table
-- Date: 2025-10-12
-- Description: Add city_id, barangay_id, and address to employees table

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_city_id ON employees(city_id);
CREATE INDEX IF NOT EXISTS idx_employees_barangay_id ON employees(barangay_id);

-- Display success message
SELECT 'Migration completed: Added city_id, barangay_id, and address columns to employees table' as message;
