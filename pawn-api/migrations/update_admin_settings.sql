-- Update existing admin settings tables to match API structure

-- Add missing columns to branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);

-- Update contact_number to phone if needed (keep both for now)
UPDATE branches SET phone = contact_number WHERE phone IS NULL AND contact_number IS NOT NULL;

-- Set default codes for existing branches
UPDATE branches SET code = 'MAIN' WHERE code IS NULL AND name ILIKE '%main%';
UPDATE branches SET code = 'BR' || id WHERE code IS NULL;

-- Add unique constraint to code column after setting values
ALTER TABLE branches ADD CONSTRAINT branches_code_unique UNIQUE (code);

-- Insert default categories with proper interest rates if they don't exist
INSERT INTO categories (name, description, interest_rate) VALUES
    ('Jewelry', 'Gold, silver, and precious metal items', 3.00),
    ('Appliance', 'Electronic appliances and gadgets', 6.00)
ON CONFLICT (name) DO UPDATE SET 
    interest_rate = EXCLUDED.interest_rate,
    description = EXCLUDED.description;

-- Update voucher_types table structure if needed
-- (Already has the right structure from migration)

-- Insert default data
INSERT INTO voucher_types (code, type, description) VALUES
    ('CASH', 'cash', 'Cash payment voucher'),
    ('CHEQUE', 'cheque', 'Cheque payment voucher')
ON CONFLICT (code) DO NOTHING;

-- Insert default loan rules
INSERT INTO loan_rules (service_charge_rate, minimum_service_charge, minimum_loan_for_service) VALUES
    (0.0100, 5.00, 500.00)
ON CONFLICT DO NOTHING;

-- Update branch with default data if empty
UPDATE branches SET 
    manager_name = 'Juan Dela Cruz',
    phone = COALESCE(phone, contact_number, '+63-2-123-4567'),
    email = COALESCE(email, 'main@goldwin.ph'),
    address = COALESCE(address, '123 Main Street, Manila, Philippines')
WHERE id = (SELECT MIN(id) FROM branches);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_voucher_types_active ON voucher_types(is_active);
CREATE INDEX IF NOT EXISTS idx_voucher_types_code ON voucher_types(code);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

SELECT 'Admin settings tables updated successfully!' as message;