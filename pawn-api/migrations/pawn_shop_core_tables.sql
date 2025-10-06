-- Complete Pawn Shop Core Tables Migration
-- This file creates all the essential pawn shop business logic tables

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction sequences for generating unique numbers
CREATE TABLE IF NOT EXISTS transaction_sequences (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES branches(id),
    sequence_type VARCHAR(50) NOT NULL, -- LOAN, PAYMENT, RENEWAL, etc.
    current_number INTEGER DEFAULT 0,
    prefix VARCHAR(10) DEFAULT '',
    suffix VARCHAR(10) DEFAULT '',
    year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE),
    month INTEGER DEFAULT EXTRACT(month FROM CURRENT_DATE),
    reset_frequency VARCHAR(20) DEFAULT 'yearly', -- daily, monthly, yearly, never
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, sequence_type, year, month)
);

-- Pawners (customers) table
CREATE TABLE IF NOT EXISTS pawners (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    suffix VARCHAR(10),
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    civil_status VARCHAR(20) CHECK (civil_status IN ('single', 'married', 'divorced', 'widowed')),
    nationality VARCHAR(50) DEFAULT 'Filipino',
    
    -- Contact Information
    mobile_number VARCHAR(20),
    email VARCHAR(100),
    
    -- Address Information
    house_number VARCHAR(20),
    street VARCHAR(100),
    barangay_id INTEGER REFERENCES barangays(id),
    city_id INTEGER REFERENCES cities(id),
    province VARCHAR(50),
    postal_code VARCHAR(10),
    
    -- IDs and Documents
    id_type VARCHAR(50), -- Driver's License, SSS ID, PhilHealth, etc.
    id_number VARCHAR(100),
    id_expiry_date DATE,
    
    -- Additional Info
    occupation VARCHAR(100),
    monthly_income DECIMAL(15,2),
    emergency_contact_name VARCHAR(100),
    emergency_contact_number VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    notes TEXT,
    photo_url VARCHAR(255),
    signature_url VARCHAR(255),
    
    -- Audit Fields
    branch_id INTEGER REFERENCES branches(id),
    created_by INTEGER REFERENCES employees(id),
    updated_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    loan_number VARCHAR(50) UNIQUE,
    
    -- Customer and Branch
    pawner_id INTEGER REFERENCES pawners(id) NOT NULL,
    branch_id INTEGER REFERENCES branches(id) NOT NULL,
    
    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('new_loan', 'renewal', 'partial_payment', 'full_payment', 'auction', 'redemption')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'renewed', 'redeemed', 'expired', 'auctioned', 'cancelled')),
    
    -- Financial Information
    principal_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5,4) NOT NULL DEFAULT 0, -- Monthly interest rate (e.g., 0.03 = 3%)
    interest_amount DECIMAL(15,2) DEFAULT 0,
    penalty_rate DECIMAL(5,4) DEFAULT 0, -- Monthly penalty rate
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    service_charge DECIMAL(15,2) DEFAULT 0,
    other_charges DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    
    -- Partial Payment Fields
    discount_amount DECIMAL(10,2) DEFAULT 0,
    advance_interest DECIMAL(10,2) DEFAULT 0,
    advance_service_charge DECIMAL(10,2) DEFAULT 0,
    net_payment DECIMAL(10,2) DEFAULT 0,
    new_principal_loan DECIMAL(10,2),
    
    -- Dates
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_date TIMESTAMP, -- Date when loan was originally granted (for new_loan, or copied from parent)
    maturity_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    last_payment_date TIMESTAMP,
    
    -- Parent Transaction (for renewals)
    parent_transaction_id INTEGER REFERENCES transactions(id),
    
    -- Status Tracking
    is_active BOOLEAN DEFAULT true,
    is_expired BOOLEAN DEFAULT false,
    days_overdue INTEGER DEFAULT 0,
    
    -- Notes and Metadata
    notes TEXT,
    terms_conditions TEXT,
    
    -- Audit Fields
    created_by INTEGER REFERENCES employees(id),
    updated_by INTEGER REFERENCES employees(id),
    approved_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pawn tickets table
CREATE TABLE IF NOT EXISTS pawn_tickets (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) NOT NULL,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Ticket Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'renewed', 'expired', 'cancelled')),
    
    -- Print Information
    print_count INTEGER DEFAULT 0,
    last_printed_at TIMESTAMP,
    printed_by INTEGER REFERENCES employees(id),
    
    -- Ticket Data (JSON for flexibility)
    ticket_data JSONB,
    
    -- Partial Payment Fields
    partial_payment DECIMAL(10,2) DEFAULT 0.00,
    new_principal_loan DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    advance_interest DECIMAL(10,2) DEFAULT 0.00,
    net_payment DECIMAL(10,2) DEFAULT 0.00,
    payment_amount DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pawn items table
CREATE TABLE IF NOT EXISTS pawn_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) NOT NULL,
    
    -- Item Details
    category_id INTEGER REFERENCES categories(id) NOT NULL,
    description_id INTEGER REFERENCES descriptions(id),
    custom_description TEXT,
    
    -- Item Specifications
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    color VARCHAR(50),
    size_dimensions VARCHAR(100),
    weight DECIMAL(10,3), -- in grams
    
    -- Jewelry Specific Fields
    karat VARCHAR(10), -- 10K, 14K, 18K, 22K, 24K
    metal_type VARCHAR(50), -- Gold, Silver, Platinum, etc.
    stone_type VARCHAR(100), -- Diamond, Ruby, Sapphire, etc.
    stone_count INTEGER,
    
    -- Condition and Features
    item_condition VARCHAR(50) DEFAULT 'good' CHECK (item_condition IN ('excellent', 'very_good', 'good', 'fair', 'poor')),
    defects TEXT,
    accessories TEXT, -- Box, papers, charger, etc.
    
    -- Valuation
    appraised_value DECIMAL(15,2) NOT NULL,
    loan_amount DECIMAL(15,2) NOT NULL,
    appraisal_notes TEXT,
    
    -- Item Status
    status VARCHAR(20) DEFAULT 'in_vault' CHECK (status IN ('in_vault', 'redeemed', 'sold', 'auctioned', 'damaged', 'lost')),
    location VARCHAR(100), -- Vault location or reference
    
    -- Photos and Documents
    photo_urls TEXT[], -- Array of photo URLs
    
    -- Audit Fields
    appraised_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item appraisals table (simplified appraisals for appraiser-to-cashier workflow)
CREATE TABLE IF NOT EXISTS item_appraisals (
    id SERIAL PRIMARY KEY,
    pawner_id INTEGER NOT NULL REFERENCES pawners(id),
    appraiser_id INTEGER REFERENCES employees(id),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    estimated_value DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pawn payments table
CREATE TABLE IF NOT EXISTS pawn_payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) NOT NULL,
    
    -- Payment Details
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('interest', 'partial_redemption', 'full_redemption', 'penalty', 'service_charge')),
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'gcash', 'paymaya', 'credit_card')),
    
    -- Amount Breakdown
    amount DECIMAL(15,2) NOT NULL,
    principal_payment DECIMAL(15,2) DEFAULT 0,
    interest_payment DECIMAL(15,2) DEFAULT 0,
    penalty_payment DECIMAL(15,2) DEFAULT 0,
    service_charge_payment DECIMAL(15,2) DEFAULT 0,
    
    -- Payment Period
    period_from DATE,
    period_to DATE,
    
    -- Payment References
    reference_number VARCHAR(100), -- Check number, bank ref, etc.
    bank_name VARCHAR(100),
    
    -- Receipt Information
    receipt_number VARCHAR(50),
    receipt_printed BOOLEAN DEFAULT false,
    receipt_printed_at TIMESTAMP,
    
    -- Payment Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    
    -- Notes
    notes TEXT,
    
    -- Audit Fields
    branch_id INTEGER REFERENCES branches(id) NOT NULL,
    received_by INTEGER REFERENCES employees(id) NOT NULL,
    approved_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branch synchronization log
CREATE TABLE IF NOT EXISTS branch_sync_log (
    id SERIAL PRIMARY KEY,
    source_branch_id INTEGER REFERENCES branches(id),
    target_branch_id INTEGER REFERENCES branches(id),
    
    -- Sync Details
    sync_type VARCHAR(50) NOT NULL, -- full_sync, incremental, table_specific
    table_name VARCHAR(100),
    operation VARCHAR(20) CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Record Information
    record_id INTEGER,
    record_data JSONB,
    
    -- Sync Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP,
    
    -- Metadata
    sync_batch_id VARCHAR(100),
    priority INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description, data_type) VALUES
    ('company_name', 'Goldwin Pawnshop', 'Company name for documents and receipts', 'string'),
    ('default_interest_rate', '0.03', 'Default monthly interest rate (3%)', 'number'),
    ('default_loan_period_days', '30', 'Default loan period in days', 'number'),
    ('grace_period_days', '3', 'Grace period before penalties apply', 'number'),
    ('penalty_rate', '0.01', 'Monthly penalty rate (1%)', 'number'),
    ('max_loan_amount', '500000', 'Maximum loan amount allowed', 'number'),
    ('min_loan_amount', '100', 'Minimum loan amount allowed', 'number'),
    ('service_charge_rate', '0.02', 'Service charge rate (2%)', 'number'),
    ('auto_generate_ticket', 'true', 'Auto-generate pawn tickets', 'boolean'),
    ('require_appraisal_approval', 'true', 'Require manager approval for appraisals', 'boolean')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default transaction sequences for all branches
INSERT INTO transaction_sequences (branch_id, sequence_type, prefix, current_number) VALUES
    -- Main Branch (Branch ID 1)
    (1, 'LOAN', 'L', 0),
    (1, 'PAYMENT', 'P', 0),
    (1, 'TICKET', 'T', 0),
    (1, 'APPRAISAL', 'A', 0),
    -- Branch 2 (Branch ID 2)
    (2, 'LOAN', 'L2', 0),
    (2, 'PAYMENT', 'P2', 0),
    (2, 'TICKET', 'T2', 0),
    (2, 'APPRAISAL', 'A2', 0),
    -- Branch 3 (Branch ID 3)
    (3, 'LOAN', 'L3', 0),
    (3, 'PAYMENT', 'P3', 0),
    (3, 'TICKET', 'T3', 0),
    (3, 'APPRAISAL', 'A3', 0)
ON CONFLICT (branch_id, sequence_type, year, month) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pawners_customer_code ON pawners(customer_code);
CREATE INDEX IF NOT EXISTS idx_pawners_name ON pawners(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_pawners_mobile ON pawners(mobile_number);
CREATE INDEX IF NOT EXISTS idx_pawners_active ON pawners(is_active);
CREATE INDEX IF NOT EXISTS idx_pawners_branch ON pawners(branch_id);

CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_number ON transactions(loan_number);
CREATE INDEX IF NOT EXISTS idx_transactions_pawner ON transactions(pawner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_maturity ON transactions(maturity_date);
CREATE INDEX IF NOT EXISTS idx_transactions_branch ON transactions(branch_id);

CREATE INDEX IF NOT EXISTS idx_pawn_items_transaction ON pawn_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pawn_items_category ON pawn_items(category_id);
CREATE INDEX IF NOT EXISTS idx_pawn_items_status ON pawn_items(status);

CREATE INDEX IF NOT EXISTS idx_item_appraisals_pawner ON item_appraisals(pawner_id);
CREATE INDEX IF NOT EXISTS idx_item_appraisals_appraiser ON item_appraisals(appraiser_id);
CREATE INDEX IF NOT EXISTS idx_item_appraisals_status ON item_appraisals(status);

CREATE INDEX IF NOT EXISTS idx_payments_transaction ON pawn_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_number ON pawn_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_type ON pawn_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_branch ON pawn_payments(branch_id);

CREATE INDEX IF NOT EXISTS idx_sync_log_source_branch ON branch_sync_log(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_target_branch ON branch_sync_log(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON branch_sync_log(status);

-- Success message
SELECT 'Core pawn shop tables created successfully!' as message;