-- Admin Settings Tables Migration
-- Run this in your PostgreSQL database

-- Categories table (if not exists)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan rules configuration table
CREATE TABLE IF NOT EXISTS loan_rules (
    id SERIAL PRIMARY KEY,
    service_charge_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0100, -- 1% default
    minimum_service_charge DECIMAL(10,2) NOT NULL DEFAULT 5.00, -- ₱5 minimum
    minimum_loan_for_service DECIMAL(12,2) NOT NULL DEFAULT 500.00, -- ₱500 threshold
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voucher types table
CREATE TABLE IF NOT EXISTS voucher_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'cash', 'cheque', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branches table (if not exists)
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories if they don't exist
INSERT INTO categories (name, description, interest_rate) VALUES
    ('Jewelry', 'Gold, silver, and precious metal items', 3.00),
    ('Appliance', 'Electronic appliances and gadgets', 6.00)
ON CONFLICT (name) DO NOTHING;

-- Insert default loan rules
INSERT INTO loan_rules (service_charge_rate, minimum_service_charge, minimum_loan_for_service) VALUES
    (0.0100, 5.00, 500.00)
ON CONFLICT DO NOTHING;

-- Insert default voucher types
INSERT INTO voucher_types (code, type, description) VALUES
    ('CASH', 'cash', 'Cash payment voucher'),
    ('CHEQUE', 'cheque', 'Cheque payment voucher')
ON CONFLICT (code) DO NOTHING;

-- Insert default branch
INSERT INTO branches (name, code, address, phone, email, manager_name) VALUES
    ('Main Branch', 'MAIN', '123 Main Street, Manila, Philippines', '+63-2-123-4567', 'main@goldwin.ph', 'Juan Dela Cruz')
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_voucher_types_active ON voucher_types(is_active);
CREATE INDEX IF NOT EXISTS idx_voucher_types_code ON voucher_types(code);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- Success message
SELECT 'Admin settings tables created successfully!' as message;