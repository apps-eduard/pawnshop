-- =====================================================
-- DATABASE SCHEMA MIGRATION SCRIPT
-- Purpose: Implement comprehensive schema changes
-- Date: October 5, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TRANSACTIONS TABLE CHANGES
-- =====================================================
PRINT '🔄 Modifying TRANSACTIONS table...';

-- Add granted_date column
ALTER TABLE transactions 
ADD COLUMN granted_date DATE;

-- Remove other_charges column (if it exists)
ALTER TABLE transactions 
DROP COLUMN IF EXISTS other_charges;

-- Update granted_date with transaction_date for existing records
UPDATE transactions 
SET granted_date = transaction_date::DATE 
WHERE granted_date IS NULL AND transaction_date IS NOT NULL;

-- =====================================================
-- 2. PAWN_ITEMS TABLE CHANGES
-- =====================================================
PRINT '🔄 Modifying PAWN_ITEMS table...';

-- Remove detailed item specification columns
ALTER TABLE pawn_items 
DROP COLUMN IF EXISTS custom_description,
DROP COLUMN IF EXISTS brand,
DROP COLUMN IF EXISTS model,
DROP COLUMN IF EXISTS serial_number,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS size_dimensions,
DROP COLUMN IF EXISTS weight,
DROP COLUMN IF EXISTS karat,
DROP COLUMN IF EXISTS metal_type,
DROP COLUMN IF EXISTS stone_type,
DROP COLUMN IF EXISTS stone_count,
DROP COLUMN IF EXISTS item_condition,
DROP COLUMN IF EXISTS defects,
DROP COLUMN IF EXISTS accessories,
DROP COLUMN IF EXISTS photo_urls;

-- =====================================================
-- 3. CATEGORIES TABLE CHANGES
-- =====================================================
PRINT '🔄 Modifying CATEGORIES table...';

-- Remove description column
ALTER TABLE categories 
DROP COLUMN IF EXISTS description;

-- Add created_by and updated_by columns
ALTER TABLE categories 
ADD COLUMN created_by INTEGER REFERENCES employees(id),
ADD COLUMN updated_by INTEGER REFERENCES employees(id);

-- =====================================================
-- 4. DESCRIPTIONS TABLE CHANGES
-- =====================================================
PRINT '🔄 Modifying DESCRIPTIONS table...';

-- Rename 'name' column to 'description_name'
ALTER TABLE descriptions 
RENAME COLUMN name TO description_name;

-- Remove description column
ALTER TABLE descriptions 
DROP COLUMN IF EXISTS description;

-- =====================================================
-- 5. UPDATE EXISTING DATA
-- =====================================================
PRINT '🔄 Updating existing data...';

-- Set default values for new columns where appropriate
UPDATE categories 
SET created_by = 1, updated_by = 1 
WHERE created_by IS NULL;

PRINT '✅ Schema migration completed successfully!';

COMMIT;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================
PRINT '🔍 Verifying schema changes...';

-- Check transactions table
SELECT 'transactions' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check pawn_items table  
SELECT 'pawn_items' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pawn_items' 
ORDER BY ordinal_position;

-- Check categories table
SELECT 'categories' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categories' 
ORDER BY ordinal_position;

-- Check descriptions table
SELECT 'descriptions' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'descriptions' 
ORDER BY ordinal_position;