-- =============================================
-- APPRAISALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS appraisals (
    id SERIAL PRIMARY KEY,
    pawner_id INTEGER NOT NULL REFERENCES pawners(id),
    appraiser_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Item Information
    item_category VARCHAR(50) NOT NULL, -- Jewelry, Electronics, Appliances, Vehicles, etc.
    item_category_description TEXT,
    item_type VARCHAR(100) NOT NULL, -- Gold Ring, iPhone, etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    description TEXT NOT NULL, -- Item description
    serial_number VARCHAR(100),
    
    -- Jewelry specific fields
    weight DECIMAL(8,3), -- grams
    karat INTEGER,
    
    -- Appraisal Details
    estimated_value DECIMAL(12,2) NOT NULL, -- Item Value
    condition_notes TEXT,
    appraisal_notes TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TRANSACTIONS TABLE (For all transaction types)
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(20) UNIQUE NOT NULL,
    appraisal_id INTEGER REFERENCES appraisals(id),
    pawner_id INTEGER NOT NULL REFERENCES pawners(id),
    cashier_id INTEGER NOT NULL REFERENCES users(id),
    previous_transaction_id INTEGER REFERENCES transactions(id), -- For additional/partial/redeem/renew
    
    -- Transaction Type
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('new_loan', 'additional', 'partial', 'redeem', 'renew')),
    
    -- Dates
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    date_granted DATE NOT NULL DEFAULT CURRENT_DATE,
    date_matured DATE NOT NULL,
    date_expired DATE NOT NULL,
    
    -- Core Financial Fields (common to all transactions)
    appraisal_value DECIMAL(12,2) NOT NULL,
    principal_loan DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL, -- percentage
    
    -- Transaction-specific fields
    available_amount DECIMAL(12,2) DEFAULT 0, -- Additional loan
    discount DECIMAL(12,2) DEFAULT 0,
    previous_loan DECIMAL(12,2) DEFAULT 0, -- Additional loan
    interest_amount DECIMAL(12,2) DEFAULT 0,
    penalty DECIMAL(12,2) DEFAULT 0,
    additional_amount DECIMAL(12,2) DEFAULT 0, -- Additional loan
    new_principal_loan DECIMAL(12,2), -- For additional/partial
    partial_payment DECIMAL(12,2) DEFAULT 0, -- Partial payment
    due_amount DECIMAL(12,2) DEFAULT 0, -- Redeem/Renew
    redeem_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Payment processing
    advance_interest DECIMAL(12,2) DEFAULT 0,
    advance_service_charge DECIMAL(12,2) DEFAULT 0,
    net_proceed DECIMAL(12,2) DEFAULT 0, -- What customer receives
    net_payment DECIMAL(12,2) DEFAULT 0, -- What customer pays
    amount_received DECIMAL(12,2) DEFAULT 0, -- Actual cash received from customer
    change_amount DECIMAL(12,2) DEFAULT 0, -- Change given to customer
    
    -- Status and tracking
    loan_status VARCHAR(20) DEFAULT 'active' CHECK (loan_status IN ('active', 'paid', 'expired', 'renewed', 'defaulted', 'cancelled')),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- AUDIT TRAIL TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL, -- appraisals, transactions, etc.
    record_id INTEGER NOT NULL, -- ID of the affected record
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Store the old and new values
    old_values JSONB, -- Previous state (for UPDATE/DELETE)
    new_values JSONB, -- New state (for INSERT/UPDATE)
    
    -- Additional context
    description TEXT, -- Human-readable description of the action
    ip_address INET, -- User's IP address
    user_agent TEXT, -- Browser/client information
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TRANSACTION SEQUENCE TABLE (for generating transaction numbers)
-- =============================================
CREATE TABLE IF NOT EXISTS transaction_sequences (
    year INTEGER PRIMARY KEY,
    next_number INTEGER DEFAULT 1
);

-- =============================================
-- INDEXES FOR BETTER PERFORMANCE
-- =============================================
-- Appraisals indexes
CREATE INDEX IF NOT EXISTS idx_appraisals_pawner_id ON appraisals(pawner_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_appraiser_id ON appraisals(appraiser_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_status ON appraisals(status);
CREATE INDEX IF NOT EXISTS idx_appraisals_created_at ON appraisals(created_at);
CREATE INDEX IF NOT EXISTS idx_appraisals_item_category ON appraisals(item_category);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_pawner_id ON transactions(pawner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_appraisal_id ON transactions(appraisal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_number ON transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_status ON transactions(loan_status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_date_matured ON transactions(date_matured);
CREATE INDEX IF NOT EXISTS idx_transactions_previous_transaction_id ON transactions(previous_transaction_id);

-- Audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_name ON audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_record_id ON audit_trail(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);

-- =============================================
-- FUNCTIONS FOR AUDIT TRAIL
-- =============================================
-- Function to generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number() 
RETURNS VARCHAR(20) AS $$
DECLARE
    current_year INTEGER;
    next_num INTEGER;
    transaction_num VARCHAR(20);
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get or create sequence for current year
    INSERT INTO transaction_sequences (year, next_number) 
    VALUES (current_year, 1) 
    ON CONFLICT (year) DO NOTHING;
    
    -- Get and increment the next number
    UPDATE transaction_sequences 
    SET next_number = next_number + 1 
    WHERE year = current_year 
    RETURNING next_number - 1 INTO next_num;
    
    -- Format: 2025-000001
    transaction_num := current_year || '-' || LPAD(next_num::TEXT, 6, '0');
    
    RETURN transaction_num;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit_trail(
    p_table_name VARCHAR(50),
    p_record_id INTEGER,
    p_action VARCHAR(20),
    p_user_id INTEGER,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_trail (
        table_name, record_id, action, user_id, 
        old_values, new_values, description
    ) VALUES (
        p_table_name, p_record_id, p_action, p_user_id,
        p_old_values, p_new_values, p_description
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================
-- Insert sample appraisals
INSERT INTO appraisals (
    pawner_id, appraiser_id, item_category, item_category_description, 
    item_type, brand, model, description, estimated_value, weight, karat, status
) VALUES 
(1, 5, 'Jewelry', 'Gold jewelry and precious stones', 'Gold Ring', 'Cartier', 'Love Ring', 
 '18K Gold wedding ring with diamond accents, excellent condition', 25000.00, 8.5, 18, 'pending'),
(2, 5, 'Electronics', 'Mobile phones and electronic devices', 'Mobile Phone', 'Apple', 'iPhone 14 Pro', 
 'iPhone 14 Pro 256GB Space Black, excellent condition with original box', 45000.00, NULL, NULL, 'pending'),
(3, 5, 'Jewelry', 'Gold jewelry and precious stones', 'Gold Necklace', 'Tiffany & Co', 'Heart Tag', 
 '18K Gold heart pendant necklace with chain', 35000.00, 12.3, 18, 'pending')
ON CONFLICT DO NOTHING;

-- Initialize transaction sequence for current year
INSERT INTO transaction_sequences (year, next_number) 
VALUES (EXTRACT(YEAR FROM CURRENT_DATE), 1) 
ON CONFLICT (year) DO NOTHING;

-- =============================================
-- TABLE COMMENTS
-- =============================================
COMMENT ON TABLE appraisals IS 'Stores item appraisals created by appraisers with detailed item information';
COMMENT ON TABLE transactions IS 'Stores all loan transactions (new_loan, additional, partial, redeem, renew) processed by cashiers';
COMMENT ON TABLE audit_trail IS 'Comprehensive audit log for all database operations with user tracking';
COMMENT ON TABLE transaction_sequences IS 'Generates unique transaction numbers by year';

-- Column comments for key fields
COMMENT ON COLUMN transactions.transaction_number IS 'Unique identifier in format YYYY-NNNNNN';
COMMENT ON COLUMN transactions.transaction_type IS 'Type: new_loan, additional, partial, redeem, renew';
COMMENT ON COLUMN transactions.previous_transaction_id IS 'References previous transaction for additional/partial/redeem/renew';
COMMENT ON COLUMN audit_trail.old_values IS 'JSON snapshot of record before change';
COMMENT ON COLUMN audit_trail.new_values IS 'JSON snapshot of record after change';