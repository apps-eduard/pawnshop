-- PAWNSHOP DATABASE SCHEMA MIGRATION
-- Date: October 5, 2025
-- Purpose: Update tables according to new requirements

BEGIN;

-- =============================================
-- 1. UPDATE PAWN_ITEMS TABLE (Remove fields)
-- =============================================

-- Remove fields from pawn_items
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

-- =============================================
-- 2. UPDATE CATEGORIES TABLE
-- =============================================

-- Remove description field and add audit fields
ALTER TABLE categories 
DROP COLUMN IF EXISTS description;

-- Add audit fields if they don't exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES employees(id);

-- =============================================
-- 3. UPDATE DESCRIPTIONS TABLE
-- =============================================

-- Rename 'name' column to 'description_name'
ALTER TABLE descriptions 
RENAME COLUMN name TO description_name;

-- Remove description field
ALTER TABLE descriptions 
DROP COLUMN IF EXISTS description;

-- =============================================
-- 4. UPDATE TRANSACTIONS TABLE
-- =============================================

-- Add granted_date field
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS granted_date DATE;

-- Remove other_charges field
ALTER TABLE transactions 
DROP COLUMN IF EXISTS other_charges;

-- =============================================
-- 5. UPDATE EXISTING DATA
-- =============================================

-- Update granted_date for existing transactions (set to transaction_date)
UPDATE transactions 
SET granted_date = transaction_date::DATE 
WHERE granted_date IS NULL AND transaction_date IS NOT NULL;

COMMIT;

-- Display updated table structures
SELECT 
    'PAWN_ITEMS' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pawn_items' 
ORDER BY ordinal_position;

SELECT 
    'CATEGORIES' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'categories' 
ORDER BY ordinal_position;

SELECT 
    'DESCRIPTIONS' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'descriptions' 
ORDER BY ordinal_position;

SELECT 
    'TRANSACTIONS' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;