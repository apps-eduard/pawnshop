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
    ('Appliances', 'Electronic appliances and gadgets', 6.00)
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

-- Employees table for authentication
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('administrator', 'manager', 'cashier', 'auctioneer', 'appraiser', 'pawner')),
    branch_id INTEGER REFERENCES branches(id),
    position VARCHAR(50),
    contact_number VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default branch
INSERT INTO branches (name, code, address, phone, email, manager_name) VALUES
    ('Main Branch', 'MAIN', '123 Main Street, Manila, Philippines', '+63-2-123-4567', 'main@goldwin.ph', 'Juan Dela Cruz')
ON CONFLICT (code) DO NOTHING;

-- Insert 6 default users with password = "password"
-- Note: In production, these should be changed immediately
INSERT INTO employees (user_id, username, email, password_hash, first_name, last_name, role, branch_id, position, contact_number, address) VALUES
    (1, 'admin', 'admin@pawnshop.com', '$2b$10$INgnGFt3y9jO2V4yr6IGIOL6gt4iNTW2SYV1z.vwsVuIl8r7fWjcq', 'System', 'Administrator', 'administrator', 1, 'System Administrator', '+1-555-1001', '1001 Admin St, Main Office'),
    (2, 'cashier1', 'cashier1@pawnshop.com', '$2b$10$uY6K4vc3lqUBb.6wxArsmeLkhmh0Je5jWsdIHoJgld.8C7o8PUKEK', 'Maria', 'Cruz', 'cashier', 1, 'Cashier', '+1-555-1002', '1002 Cashier Ave, Branch Office'),
    (3, 'manager1', 'manager1@pawnshop.com', '$2b$10$ihvUxBfqVM88nduds8CTGOKcQMZAu8Dsw5UvdG0pxsUunZ8i0.GSS', 'Juan', 'Dela Cruz', 'manager', 1, 'Branch Manager', '+1-555-1003', '1003 Manager Blvd, Main Branch'),
    (4, 'auctioneer1', 'auctioneer1@pawnshop.com', '$2b$10$M/YL/z9kApcY5bYt6Ps8aObn/iNvU/TZyKoKZu0tz7WFwPDfoFblW', 'Pedro', 'Santos', 'auctioneer', 1, 'Auctioneer', '+1-555-1004', '1004 Auction St, Auction Center'),
    (5, 'appraiser1', 'appraiser1@pawnshop.com', '$2b$10$EKh3SN6AYVuQS18Nns9XM.KWBAdxYoVy', 'Ana', 'Garcia', 'appraiser', 1, 'Item Appraiser', '+1-555-1005', '1005 Appraisal Ave, Assessment Office'),
    (6, 'pawner1', 'pawner1@pawnshop.com', '$2b$10$uGfc6h4ZTwCK3GD4g9ONEuOnmKq.JdcoDmHAETyjM48chOgcWQIJ6', 'Customer', 'Sample', 'pawner', 1, 'Customer', '+1-555-1006', '1006 Customer St, City Center')
ON CONFLICT (username) DO NOTHING;

-- Audit logs table for tracking system activities
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trails table for detailed transaction tracking
CREATE TABLE IF NOT EXISTS audit_trails (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER,
    loan_number VARCHAR(20),
    user_id INTEGER,
    username VARCHAR(50),
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, PAYMENT, RENEWAL, etc.
    description TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    amount DECIMAL(15,2),
    status_before VARCHAR(20),
    status_after VARCHAR(20),
    branch_id INTEGER REFERENCES branches(id),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES employees(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_voucher_types_active ON voucher_types(is_active);
CREATE INDEX IF NOT EXISTS idx_voucher_types_code ON voucher_types(code);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trails_transaction_id ON audit_trails(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_loan_number ON audit_trails(loan_number);
CREATE INDEX IF NOT EXISTS idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_action_type ON audit_trails(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_trails_created_at ON audit_trails(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trails_branch_id ON audit_trails(branch_id);

-- Success message
SELECT 'Admin settings tables created successfully!' as message;