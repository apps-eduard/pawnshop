-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    interest_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0500, -- 5% default
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_timestamp 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_categories_updated_at();

-- Insert default categories
INSERT INTO categories (name, interest_rate, notes) VALUES 
    ('Jewelry', 0.0300, 'Gold, silver, and precious metal items including rings, necklaces, bracelets, and earrings'),     -- 3% interest
    ('Appliances', 0.0600, 'Household appliances including refrigerators, washing machines, air conditioners, and electronics')   -- 6% interest
ON CONFLICT (name) DO NOTHING;