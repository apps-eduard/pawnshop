-- Migration: Update Audit Tables Schema
-- This migration updates the audit_logs and audit_trails tables to match the documented schema

-- Drop old audit tables if they exist with wrong structure
DROP TABLE IF EXISTS audit_trails CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Recreate audit_logs with correct schema
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

-- Recreate audit_trails with correct schema
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

-- Create indexes for better query performance
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

COMMENT ON TABLE audit_logs IS 'General system audit log for tracking all user actions and system events';
COMMENT ON TABLE audit_trails IS 'Transaction-specific audit trail for detailed financial transaction tracking';
