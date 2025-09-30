-- Add missing columns to pawners table
ALTER TABLE pawners 
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id),
ADD COLUMN IF NOT EXISTS address_details TEXT;

-- Update existing pawners with default values (Manila and Ermita)
UPDATE pawners 
SET city_id = 1, barangay_id = 1, address_details = COALESCE(address, 'Address not specified')
WHERE city_id IS NULL;

-- Make the new columns NOT NULL after setting default values
ALTER TABLE pawners 
ALTER COLUMN city_id SET NOT NULL,
ALTER COLUMN barangay_id SET NOT NULL,
ALTER COLUMN address_details SET NOT NULL;