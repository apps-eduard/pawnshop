-- Migration to add region categories and update cities region management
-- Date: October 5, 2025

BEGIN;

-- Create region_categories table for Luzon, Visayas, Mindanao classification
CREATE TABLE IF NOT EXISTS region_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Luzon', 'Visayas', 'Mindanao'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the three main region categories
INSERT INTO region_categories (name, description) VALUES 
('Luzon', 'Northern main island of the Philippines'),
('Visayas', 'Central island group of the Philippines'),
('Mindanao', 'Southern main island of the Philippines')
ON CONFLICT (name) DO NOTHING;

-- Add region_category_id to cities table
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS region_category_id INTEGER,
ADD CONSTRAINT fk_cities_region_category 
    FOREIGN KEY (region_category_id) 
    REFERENCES region_categories(id);

-- Update existing cities with appropriate region categories based on their current region data
-- Luzon regions
UPDATE cities 
SET region_category_id = (SELECT id FROM region_categories WHERE name = 'Luzon')
WHERE region ILIKE '%Metro Manila%' 
   OR region ILIKE '%Region I%' 
   OR region ILIKE '%Region II%' 
   OR region ILIKE '%Region III%' 
   OR region ILIKE '%Region IV-A%' 
   OR region ILIKE '%Region IV-B%' 
   OR region ILIKE '%Region V%'
   OR region ILIKE '%CAR%'
   OR region ILIKE '%Cordillera%';

-- Visayas regions  
UPDATE cities 
SET region_category_id = (SELECT id FROM region_categories WHERE name = 'Visayas')
WHERE region ILIKE '%Region VI%' 
   OR region ILIKE '%Region VII%' 
   OR region ILIKE '%Region VIII%'
   OR region ILIKE '%Western Visayas%'
   OR region ILIKE '%Central Visayas%'
   OR region ILIKE '%Eastern Visayas%';

-- Mindanao regions
UPDATE cities 
SET region_category_id = (SELECT id FROM region_categories WHERE name = 'Mindanao')
WHERE region ILIKE '%Region IX%' 
   OR region ILIKE '%Region X%' 
   OR region ILIKE '%Region XI%' 
   OR region ILIKE '%Region XII%' 
   OR region ILIKE '%Region XIII%'
   OR region ILIKE '%BARMM%'
   OR region ILIKE '%ARMM%'
   OR region ILIKE '%Zamboanga%'
   OR region ILIKE '%Northern Mindanao%'
   OR region ILIKE '%Davao%'
   OR region ILIKE '%SOCCSKSARGEN%'
   OR region ILIKE '%Caraga%';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cities_region_category_id ON cities(region_category_id);
CREATE INDEX IF NOT EXISTS idx_region_categories_name ON region_categories(name);

COMMIT;

-- Verification queries
SELECT 'Region Categories Created:' as info;
SELECT * FROM region_categories ORDER BY id;

SELECT 'Cities by Region Category:' as info;
SELECT 
    rc.name as region_category,
    COUNT(c.id) as city_count,
    STRING_AGG(c.name, ', ' ORDER BY c.name) as sample_cities
FROM region_categories rc
LEFT JOIN cities c ON c.region_category_id = rc.id
GROUP BY rc.id, rc.name
ORDER BY rc.id;