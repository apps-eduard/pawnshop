-- Drop existing tables if they exist (in correct order to avoid foreign key conflicts)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS pawn_payments CASCADE;
DROP TABLE IF EXISTS pawn_items CASCADE;
DROP TABLE IF EXISTS pawn_tickets CASCADE;
DROP TABLE IF EXISTS pawners CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS barangays CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- Create branches table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(20),
    manager_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cities table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    province VARCHAR(100),
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create barangays table
CREATE TABLE barangays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities(id),
    postal_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employees table (replaces users table)
CREATE TABLE employees (
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

-- Create pawners table (updated with city/barangay references)
CREATE TABLE pawners (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    city_id INTEGER REFERENCES cities(id),
    barangay_id INTEGER REFERENCES barangays(id),
    address_details TEXT,
    id_type VARCHAR(50),
    id_number VARCHAR(50),
    birth_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pawn_tickets table
CREATE TABLE pawn_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    pawner_id INTEGER NOT NULL REFERENCES pawners(id),
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    created_by INTEGER NOT NULL REFERENCES employees(user_id),
    principal_amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 3.00,
    service_charge DECIMAL(8,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    maturity_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'renewed', 'redeemed', 'expired', 'auctioned')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pawn_items table
CREATE TABLE pawn_items (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES pawn_tickets(id) ON DELETE CASCADE,
    item_type VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    description TEXT NOT NULL,
    estimated_value DECIMAL(10,2) NOT NULL,
    condition_notes TEXT,
    serial_number VARCHAR(100),
    weight DECIMAL(8,3),
    karat INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pawn_payments table
CREATE TABLE pawn_payments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES pawn_tickets(id),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('interest', 'partial_redemption', 'full_redemption', 'renewal')),
    amount DECIMAL(10,2) NOT NULL,
    processed_by INTEGER NOT NULL REFERENCES employees(user_id),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(user_id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for manager_id in branches table
ALTER TABLE branches ADD CONSTRAINT fk_branches_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(user_id);

-- Create indexes for better performance
CREATE INDEX idx_employees_username ON employees(username);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_cities_name ON cities(name);
CREATE INDEX idx_barangays_name ON barangays(name);
CREATE INDEX idx_barangays_city ON barangays(city_id);
CREATE INDEX idx_pawners_contact ON pawners(contact_number);
CREATE INDEX idx_pawn_tickets_number ON pawn_tickets(ticket_number);
CREATE INDEX idx_pawn_tickets_status ON pawn_tickets(status);
CREATE INDEX idx_pawn_tickets_pawner ON pawn_tickets(pawner_id);
CREATE INDEX idx_pawn_tickets_maturity ON pawn_tickets(maturity_date);
CREATE INDEX idx_pawn_items_ticket ON pawn_items(ticket_id);
CREATE INDEX idx_pawn_payments_ticket ON pawn_payments(ticket_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pawners_updated_at BEFORE UPDATE ON pawners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pawn_tickets_updated_at BEFORE UPDATE ON pawn_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create system_config table for storing application configuration
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default transaction configuration
INSERT INTO system_config (config_key, config_value, description) VALUES 
('transaction_number_format', '{"prefix":"TXN","includeYear":true,"includeMonth":true,"includeDay":true,"sequenceDigits":2,"branchCodePrefix":true,"separator":"-"}', 'Transaction number format configuration');