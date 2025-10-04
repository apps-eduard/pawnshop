-- Update category descriptions table structure
-- Change table name from category_descriptions to descriptions
-- Change field name from description to notes

-- First, check if the old table exists and rename it
DO $$
BEGIN
    -- Check if category_descriptions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'category_descriptions') THEN
        -- Drop the old table if it exists (we'll recreate with new structure)
        DROP TABLE IF EXISTS category_descriptions CASCADE;
        RAISE NOTICE 'Dropped old category_descriptions table';
    END IF;
END $$;

-- Create descriptions table with new structure
CREATE TABLE IF NOT EXISTS descriptions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    notes TEXT NOT NULL,  -- Changed from 'description' to 'notes'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, notes)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_descriptions_timestamp 
    BEFORE UPDATE ON descriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_descriptions_updated_at();

-- Insert comprehensive category descriptions/notes
INSERT INTO descriptions (category_id, notes) 
SELECT 
    c.id,
    notes_data.note_text
FROM categories c
CROSS JOIN (
    VALUES 
        -- Jewelry with specific details and remarks
        ('Jewelry', '21K Gold Ring - High purity gold, excellent resale value'),
        ('Jewelry', '18K Gold Ring - Standard jewelry gold, good durability'),
        ('Jewelry', '14K Gold Ring - Lower gold content, more affordable'),
        ('Jewelry', '21K Gold Necklace - Premium gold chains and pendants'),
        ('Jewelry', '18K Gold Necklace - Popular choice for everyday wear'),
        ('Jewelry', '14K Gold Necklace - Budget-friendly gold jewelry'),
        ('Jewelry', '21K Gold Bracelet - Heavy gold bracelets, high value'),
        ('Jewelry', '18K Gold Bracelet - Classic gold bracelet designs'),
        ('Jewelry', '14K Gold Bracelet - Lightweight and durable'),
        ('Jewelry', '21K Gold Earrings - Traditional Filipino gold earrings'),
        ('Jewelry', '18K Gold Earrings - Modern gold earring styles'),
        ('Jewelry', '14K Gold Earrings - Simple and elegant designs'),
        ('Jewelry', 'Sterling Silver Ring - 925 silver, tarnish-resistant'),
        ('Jewelry', 'Sterling Silver Necklace - Pure silver jewelry'),
        ('Jewelry', 'Sterling Silver Bracelet - Hypoallergenic silver'),
        ('Jewelry', 'Sterling Silver Earrings - Comfortable daily wear'),
        ('Jewelry', '21K Wedding Ring - Traditional Philippine wedding bands'),
        ('Jewelry', '18K Wedding Ring - Durable marriage symbols'),
        ('Jewelry', '21K Engagement Ring - High-value proposal rings'),
        ('Jewelry', '18K Engagement Ring - Classic diamond settings'),
        ('Jewelry', 'Gold Chain - Various weights and styles available'),
        ('Jewelry', 'Gold Pendant - Religious and decorative pendants'),
        ('Jewelry', 'Gold Watch - Luxury timepieces with gold bands'),
        ('Jewelry', 'Diamond Ring - Natural diamonds, certified quality'),
        ('Jewelry', 'Pearl Necklace - Natural and cultured pearls'),
        ('Jewelry', 'Rosary Gold - Religious gold rosaries'),
        ('Jewelry', 'Anklet Gold - Traditional Filipino anklets'),
        ('Jewelry', 'Charm Bracelet - Collectible charm jewelry'),
        ('Jewelry', 'Signet Ring - Personalized family rings'),
        ('Jewelry', 'Tennis Bracelet - Diamond or gemstone line bracelets'),
        
        -- Appliances with specific details and condition notes
        ('Appliances', '32" LED TV - Small room entertainment, energy efficient'),
        ('Appliances', '43" LED TV - Medium room size, Full HD display'),
        ('Appliances', '50" LED TV - Family room entertainment center'),
        ('Appliances', '55" LED TV - Popular home theater size'),
        ('Appliances', '65" LED TV - Large family entertainment'),
        ('Appliances', '75" LED TV - Premium home cinema experience'),
        ('Appliances', 'Inverter Refrigerator - Energy saving, quiet operation'),
        ('Appliances', 'No Frost Refrigerator - Automatic defrost, convenient'),
        ('Appliances', 'Mini Refrigerator - Compact, dormitory/office use'),
        ('Appliances', 'Top Load Washing Machine - Traditional Filipino preference'),
        ('Appliances', 'Front Load Washing Machine - Space efficient, gentle wash'),
        ('Appliances', 'Semi-Automatic Washing Machine - Budget-friendly option'),
        ('Appliances', 'Window Type Aircon - Affordable cooling solution'),
        ('Appliances', 'Split Type Aircon - Quiet, efficient cooling'),
        ('Appliances', 'Inverter Aircon - Energy efficient, variable speed'),
        ('Appliances', 'Stand Fan - Portable air circulation'),
        ('Appliances', 'Ceiling Fan - Permanent room cooling'),
        ('Appliances', 'Tower Fan - Modern oscillating design'),
        ('Appliances', 'Electric Rice Cooker - Essential Filipino kitchen appliance'),
        ('Appliances', 'Gas Range - Multi-burner cooking stove'),
        ('Appliances', 'Electric Stove - Safe indoor cooking option'),
        ('Appliances', 'Microwave Oven - Quick heating and cooking'),
        ('Appliances', 'Oven Toaster - Compact baking solution'),
        ('Appliances', 'Blender - Food preparation and smoothies'),
        ('Appliances', 'Food Processor - Multi-function food preparation'),
        ('Appliances', 'Electric Kettle - Fast water boiling'),
        ('Appliances', 'Coffee Maker - Automatic coffee brewing'),
        ('Appliances', 'Electric Iron - Clothing care essential'),
        ('Appliances', 'Steam Iron - Professional garment care'),
        ('Appliances', 'Vacuum Cleaner - Home cleaning equipment'),
        ('Appliances', 'Water Dispenser - Hot and cold water access'),
        ('Appliances', 'Electric Grill - Indoor grilling solution'),
        ('Appliances', 'Induction Cooker - Modern cooking technology'),
        ('Appliances', 'Deep Fryer - Commercial-style frying'),
        ('Appliances', 'Dishwasher - Automatic dish cleaning'),
        ('Appliances', 'Air Fryer - Healthy oil-free cooking'),
        ('Appliances', 'Pressure Cooker - Fast cooking appliance'),
        ('Appliances', 'Bread Maker - Automatic bread baking'),
        ('Appliances', 'Juicer - Fresh fruit juice extraction'),
        ('Appliances', 'Electric Grill Pan - Non-stick grilling'),
        ('Appliances', 'Slow Cooker - Long cooking time recipes'),
        ('Appliances', 'Sandwich Maker - Quick breakfast solution'),
        ('Appliances', 'Waffle Maker - Breakfast specialty appliance'),
        ('Appliances', 'Electric Mixer - Baking preparation tool'),
        ('Appliances', 'Dehumidifier - Moisture control appliance')
) AS notes_data(category, note_text)
WHERE c.name = notes_data.category
ON CONFLICT (category_id, notes) DO NOTHING;