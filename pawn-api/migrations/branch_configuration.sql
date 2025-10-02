-- Branch Configuration Migration
-- This migration adds branch tracking system for multi-branch setup

-- Create system_config table to store current branch configuration
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at on system_config
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration for current branch
-- This should be updated during installation to set the actual branch ID
INSERT INTO system_config (config_key, config_value, description) 
VALUES (
    'current_branch_id', 
    '1', 
    'The ID of the branch this system installation represents'
) ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description) 
VALUES (
    'installation_type', 
    'branch', 
    'Type of installation: main, branch, or sync'
) ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description) 
VALUES (
    'sync_enabled', 
    'true', 
    'Whether this installation should sync with other branches'
) ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description) 
VALUES (
    'last_sync_timestamp', 
    '1970-01-01 00:00:00', 
    'Last successful sync with main server'
) ON CONFLICT (config_key) DO NOTHING;

-- Add branch_id to tables that don't have it yet (if they exist)
-- Add branch_id to pawners table for tracking which branch created the pawner
ALTER TABLE pawners ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);

-- Add branch_id to audit_logs for tracking which branch made the change
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);

-- Create branch_sync_log table to track synchronization between branches
CREATE TABLE IF NOT EXISTS branch_sync_log (
    id SERIAL PRIMARY KEY,
    source_branch_id INTEGER NOT NULL REFERENCES branches(id),
    target_branch_id INTEGER REFERENCES branches(id), -- NULL for main server
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('push', 'pull', 'full')),
    table_name VARCHAR(50) NOT NULL,
    records_synced INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    sync_data JSONB -- Store sync metadata
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pawners_branch ON pawners(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch ON audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_branch_sync_log_source ON branch_sync_log(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_sync_log_target ON branch_sync_log(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_sync_log_status ON branch_sync_log(status);

-- Create a view to easily get current branch information
CREATE OR REPLACE VIEW current_branch_info AS
SELECT 
    b.id,
    b.name,
    b.address,
    b.contact_number,
    b.manager_id,
    b.is_active,
    sc.config_value as installation_type,
    sc2.config_value as sync_enabled
FROM branches b
JOIN system_config sc ON sc.config_key = 'current_branch_id' AND b.id = sc.config_value::integer
LEFT JOIN system_config sc2 ON sc2.config_key = 'installation_type'
LEFT JOIN system_config sc3 ON sc3.config_key = 'sync_enabled';

-- Function to get current branch ID
CREATE OR REPLACE FUNCTION get_current_branch_id()
RETURNS INTEGER AS $$
DECLARE
    branch_id INTEGER;
BEGIN
    SELECT config_value::integer INTO branch_id 
    FROM system_config 
    WHERE config_key = 'current_branch_id';
    
    RETURN COALESCE(branch_id, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to update system configuration
CREATE OR REPLACE FUNCTION update_system_config(key TEXT, value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO system_config (config_key, config_value, updated_at)
    VALUES (key, value, CURRENT_TIMESTAMP)
    ON CONFLICT (config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to have branch_id where missing
-- Update pawners without branch_id to use current branch
UPDATE pawners 
SET branch_id = get_current_branch_id() 
WHERE branch_id IS NULL;

-- Update audit_logs without branch_id to use current branch
UPDATE audit_logs 
SET branch_id = get_current_branch_id() 
WHERE branch_id IS NULL;

COMMENT ON TABLE system_config IS 'System configuration for branch-specific settings';
COMMENT ON TABLE branch_sync_log IS 'Log of synchronization activities between branches';
COMMENT ON FUNCTION get_current_branch_id() IS 'Returns the current branch ID for this installation';
COMMENT ON FUNCTION update_system_config(TEXT, TEXT) IS 'Updates or inserts system configuration values';