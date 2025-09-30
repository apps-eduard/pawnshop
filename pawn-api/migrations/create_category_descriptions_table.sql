-- Create category_descriptions table
CREATE TABLE IF NOT EXISTS category_descriptions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, description)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_category_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_category_descriptions_timestamp 
    BEFORE UPDATE ON category_descriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_category_descriptions_updated_at();

-- Insert default category descriptions
INSERT INTO category_descriptions (category_id, description) 
SELECT 
    c.id,
    descriptions.description_text
FROM categories c
CROSS JOIN (
    VALUES 
        -- Jewelry with specific karat and type
        ('Jewelry', '21K Gold Ring'),
        ('Jewelry', '18K Gold Ring'),
        ('Jewelry', '14K Gold Ring'),
        ('Jewelry', '21K Gold Necklace'),
        ('Jewelry', '18K Gold Necklace'),
        ('Jewelry', '14K Gold Necklace'),
        ('Jewelry', '21K Gold Bracelet'),
        ('Jewelry', '18K Gold Bracelet'),
        ('Jewelry', '14K Gold Bracelet'),
        ('Jewelry', '21K Gold Earrings'),
        ('Jewelry', '18K Gold Earrings'),
        ('Jewelry', '14K Gold Earrings'),
        ('Jewelry', 'Sterling Silver Ring'),
        ('Jewelry', 'Sterling Silver Necklace'),
        ('Jewelry', 'Sterling Silver Bracelet'),
        ('Jewelry', 'Sterling Silver Earrings'),
        ('Jewelry', '21K Wedding Ring'),
        ('Jewelry', '18K Wedding Ring'),
        ('Jewelry', '21K Engagement Ring'),
        ('Jewelry', '18K Engagement Ring'),
        ('Jewelry', 'Gold Chain'),
        ('Jewelry', 'Gold Pendant'),
        ('Jewelry', 'Gold Watch'),
        ('Jewelry', 'Diamond Ring'),
        ('Jewelry', 'Pearl Necklace'),
        
        -- Appliances with specific sizes and types
        ('Appliances', '32" LED TV'),
        ('Appliances', '43" LED TV'),
        ('Appliances', '50" LED TV'),
        ('Appliances', '55" LED TV'),
        ('Appliances', '65" LED TV'),
        ('Appliances', '75" LED TV'),
        ('Appliances', 'Inverter Refrigerator'),
        ('Appliances', 'No Frost Refrigerator'),
        ('Appliances', 'Mini Refrigerator'),
        ('Appliances', 'Top Load Washing Machine'),
        ('Appliances', 'Front Load Washing Machine'),
        ('Appliances', 'Semi-Automatic Washing Machine'),
        ('Appliances', 'Window Type Aircon'),
        ('Appliances', 'Split Type Aircon'),
        ('Appliances', 'Inverter Aircon'),
        ('Appliances', 'Stand Fan'),
        ('Appliances', 'Ceiling Fan'),
        ('Appliances', 'Tower Fan'),
        ('Appliances', 'Electric Rice Cooker'),
        ('Appliances', 'Gas Range'),
        ('Appliances', 'Electric Stove'),
        ('Appliances', 'Microwave Oven'),
        ('Appliances', 'Oven Toaster'),
        ('Appliances', 'Blender'),
        ('Appliances', 'Food Processor'),
        ('Appliances', 'Electric Kettle'),
        ('Appliances', 'Coffee Maker'),
        ('Appliances', 'Electric Iron'),
        ('Appliances', 'Steam Iron'),
        ('Appliances', 'Vacuum Cleaner'),
        ('Appliances', 'Water Dispenser'),
        ('Appliances', 'Electric Grill'),
        ('Appliances', 'Induction Cooker'),
        ('Appliances', 'Deep Fryer'),
        ('Appliances', 'Dishwasher')
) AS descriptions(category, description_text)
WHERE c.name = descriptions.category
ON CONFLICT (category_id, description) DO NOTHING;