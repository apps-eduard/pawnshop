-- Migration: Add system_config table for application configuration
-- Date: 2025-10-03
-- Description: Adds system_config table to store transaction number format and other settings

-- Create system_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_config_updated_at') THEN
        CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Insert default transaction configuration if it doesn't exist
INSERT INTO system_config (config_key, config_value, description) 
VALUES ('transaction_number_format', 
        '{"prefix":"TXN","includeYear":true,"includeMonth":true,"includeDay":true,"sequenceDigits":2,"branchCodePrefix":true,"separator":"-"}', 
        'Transaction number format configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Add branch code column to branches table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'branches' AND column_name = 'code') THEN
        ALTER TABLE branches ADD COLUMN code VARCHAR(3) UNIQUE;
        
        -- Update existing branches with default codes
        UPDATE branches SET code = 'MN' || id::text WHERE code IS NULL;
        
        -- Make code NOT NULL after setting default values
        ALTER TABLE branches ALTER COLUMN code SET NOT NULL;
    END IF;
END
$$;

-- Create index on config_key for better performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- Insert sample transaction config if needed
INSERT INTO system_config (config_key, config_value, description) VALUES
('default_branch_codes', '["MNL","QZN","CDO","DVO","ILO","BAG","TAC","BCD","CEB","BTG"]', 'Common branch codes for Philippines')
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE system_config IS 'System-wide configuration settings';
COMMENT ON COLUMN system_config.config_key IS 'Unique identifier for configuration setting';
COMMENT ON COLUMN system_config.config_value IS 'JSON or text value of the configuration';