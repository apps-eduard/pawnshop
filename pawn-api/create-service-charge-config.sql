-- =====================================================
-- SERVICE CHARGE CONFIGURATION TABLE
-- Purpose: Dynamic service charge calculation settings
-- Date: October 5, 2025
-- =====================================================

-- Create service_charge_brackets table for dynamic service charge settings
CREATE TABLE IF NOT EXISTS service_charge_brackets (
    id SERIAL PRIMARY KEY,
    bracket_name VARCHAR(100) NOT NULL,
    min_amount NUMERIC NOT NULL,
    max_amount NUMERIC,  -- NULL means no upper limit
    service_charge NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_by INTEGER REFERENCES employees(id),
    updated_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_bracket_range UNIQUE (min_amount, max_amount)
);

-- Insert default service charge brackets
INSERT INTO service_charge_brackets (bracket_name, min_amount, max_amount, service_charge, display_order, created_by, updated_by) VALUES
('Bracket 1-100', 1, 100, 1, 1, 1, 1),
('Bracket 101-200', 101, 200, 2, 2, 1, 1),
('Bracket 201-300', 201, 300, 3, 3, 1, 1),
('Bracket 301-400', 301, 400, 4, 4, 1, 1),
('Bracket 500+', 500, NULL, 5, 5, 1, 1)
ON CONFLICT (min_amount, max_amount) DO UPDATE SET
    service_charge = EXCLUDED.service_charge,
    bracket_name = EXCLUDED.bracket_name,
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP;

-- Create service charge configuration table for general settings
CREATE TABLE IF NOT EXISTS service_charge_config (
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

-- Insert default service charge configuration
INSERT INTO service_charge_config (config_key, config_value, description, created_by, updated_by) VALUES
('calculation_method', 1, 'Service charge calculation method (1=bracket-based, 2=percentage, 3=fixed)', 1, 1),
('percentage_rate', 0.01, 'Percentage rate for percentage-based calculation (1% = 0.01)', 1, 1),
('fixed_amount', 50, 'Fixed service charge amount', 1, 1),
('minimum_service_charge', 1, 'Minimum service charge amount', 1, 1),
('maximum_service_charge', 1000, 'Maximum service charge amount', 1, 1)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP;

-- Create service_charge_calculation_log table to track service charge calculations
CREATE TABLE IF NOT EXISTS service_charge_calculation_log (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    calculation_date DATE NOT NULL,
    principal_amount NUMERIC NOT NULL,
    service_charge_amount NUMERIC NOT NULL,
    calculation_method VARCHAR(50) NOT NULL, -- 'bracket', 'percentage', 'fixed'
    bracket_used VARCHAR(100), -- Which bracket was applied
    config_snapshot JSONB, -- Store the config used for this calculation
    calculated_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for service charge tables
CREATE INDEX IF NOT EXISTS idx_service_charge_brackets_range ON service_charge_brackets(min_amount, max_amount) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_charge_config_key ON service_charge_config(config_key) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_charge_log_transaction ON service_charge_calculation_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_service_charge_log_date ON service_charge_calculation_log(calculation_date);