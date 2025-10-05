-- =====================================================
-- PENALTY CONFIGURATION TABLE
-- Purpose: Dynamic penalty calculation settings
-- Date: October 5, 2025
-- =====================================================

-- Create penalty_config table for dynamic penalty settings
CREATE TABLE IF NOT EXISTS penalty_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_by INTEGER REFERENCES employees(id),
    updated_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default penalty configuration
INSERT INTO penalty_config (config_key, config_value, description, created_by, updated_by) VALUES
('monthly_penalty_rate', 0.02, 'Monthly penalty rate (2% = 0.02)', 1, 1),
('daily_penalty_threshold_days', 3, 'Days threshold for daily vs monthly penalty (less than 3 days = daily)', 1, 1),
('grace_period_days', 0, 'Grace period in days before penalty starts', 1, 1),
('penalty_compounding', 0, 'Whether penalty compounds (0 = no, 1 = yes)', 1, 1),
('max_penalty_multiplier', 12, 'Maximum penalty multiplier (e.g., 12 months worth)', 1, 1)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_penalty_config_key ON penalty_config(config_key) WHERE is_active = TRUE;

-- Create penalty_calculation_log table to track penalty calculations
CREATE TABLE IF NOT EXISTS penalty_calculation_log (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    calculation_date DATE NOT NULL,
    principal_amount NUMERIC NOT NULL,
    days_overdue INTEGER NOT NULL,
    penalty_rate NUMERIC NOT NULL,
    penalty_amount NUMERIC NOT NULL,
    calculation_method VARCHAR(50) NOT NULL, -- 'daily' or 'monthly'
    config_snapshot JSONB, -- Store the config used for this calculation
    calculated_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for penalty calculation log
CREATE INDEX IF NOT EXISTS idx_penalty_log_transaction ON penalty_calculation_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_penalty_log_date ON penalty_calculation_log(calculation_date);