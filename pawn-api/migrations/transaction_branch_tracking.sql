-- Additional Branch Tracking Migration
-- Add branch_id to transaction tables for complete branch tracking

-- Add branch_id to appraisals table
ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);

-- Add branch_id to transactions table  
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);

-- Add branch_id to audit_trail table (if it doesn't have it already)
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);

-- Create indexes for new branch_id columns
CREATE INDEX IF NOT EXISTS idx_appraisals_branch_id ON appraisals(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_branch_id ON audit_trail(branch_id);

-- Update existing records to have current branch_id
UPDATE appraisals 
SET branch_id = get_current_branch_id() 
WHERE branch_id IS NULL;

UPDATE transactions 
SET branch_id = get_current_branch_id() 
WHERE branch_id IS NULL;

UPDATE audit_trail 
SET branch_id = get_current_branch_id() 
WHERE branch_id IS NULL;

-- Update the log_audit_trail function to include branch_id
CREATE OR REPLACE FUNCTION log_audit_trail(
    p_table_name VARCHAR(50),
    p_record_id INTEGER,
    p_action VARCHAR(20),
    p_user_id INTEGER,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_branch_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- If no branch_id provided, get current branch
    IF p_branch_id IS NULL THEN
        p_branch_id := get_current_branch_id();
    END IF;

    INSERT INTO audit_trail (
        table_name, record_id, action, user_id, 
        old_values, new_values, description, branch_id
    ) VALUES (
        p_table_name, p_record_id, p_action, p_user_id,
        p_old_values, p_new_values, p_description, p_branch_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN appraisals.branch_id IS 'Branch where the appraisal was created';
COMMENT ON COLUMN transactions.branch_id IS 'Branch where the transaction was processed';
COMMENT ON COLUMN audit_trail.branch_id IS 'Branch where the action was performed';