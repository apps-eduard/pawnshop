-- Add notes field to existing categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing categories with notes
UPDATE categories SET notes = 'Gold, silver, and precious metal items including rings, necklaces, bracelets, and earrings' WHERE name = 'Jewelry';
UPDATE categories SET notes = 'Household appliances including refrigerators, washing machines, air conditioners, and electronics' WHERE name = 'Appliances';