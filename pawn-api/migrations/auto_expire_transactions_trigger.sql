-- =====================================================
-- Automatic Transaction Status Update Trigger
-- =====================================================
-- This trigger automatically updates transaction status to 'expired'
-- when the expiry_date has passed and status is still 'active'

-- Step 1: Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION update_expired_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If querying/updating a transaction and it's expired, update its status
    IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status := 'expired';
        NEW.updated_at := CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Transaction % automatically set to expired (expiry date: %)', 
                     NEW.transaction_number, NEW.expiry_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger on INSERT and UPDATE
CREATE TRIGGER auto_expire_transactions
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_expired_transaction_status();

-- Step 3: One-time update for all existing expired transactions
UPDATE transactions
SET 
    status = 'expired',
    updated_at = CURRENT_TIMESTAMP
WHERE expiry_date < CURRENT_DATE
  AND status = 'active';

-- Verify the trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_expire_transactions';

-- Check how many transactions were updated
SELECT 
    COUNT(*) as expired_count
FROM transactions
WHERE status = 'expired';
