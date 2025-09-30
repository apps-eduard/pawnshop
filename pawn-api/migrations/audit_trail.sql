-- Audit trail table for tracking admin changes
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    table_name VARCHAR(50) NOT NULL, -- 'categories', 'branches', etc.
    record_id INTEGER, -- ID of the affected record
    old_values JSONB, -- Previous values (for updates/deletes)
    new_values JSONB, -- New values (for creates/updates)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON admin_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at);

-- Insert sample audit logs for demonstration
INSERT INTO admin_audit_log (user_id, action, table_name, record_id, new_values) VALUES
    (1, 'CREATE', 'categories', 1, '{"name": "Jewelry", "interest_rate": 3.00}'),
    (1, 'CREATE', 'categories', 2, '{"name": "Appliance", "interest_rate": 6.00}'),
    (1, 'UPDATE', 'loan_rules', 1, '{"service_charge_rate": 0.01, "minimum_service_charge": 5.00}');

SELECT 'Audit trail table created successfully!' as message;