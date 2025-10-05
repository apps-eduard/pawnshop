-- Remove unused appraisals table
-- Date: October 5, 2025

BEGIN;

-- Check if appraisals table exists and is empty
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appraisals') THEN
        -- Check if table is empty
        IF (SELECT COUNT(*) FROM appraisals) = 0 THEN
            RAISE NOTICE 'Dropping unused appraisals table (0 rows)...';
            DROP TABLE appraisals;
            RAISE NOTICE 'appraisals table dropped successfully';
        ELSE
            RAISE NOTICE 'appraisals table contains data - skipping deletion';
        END IF;
    ELSE
        RAISE NOTICE 'appraisals table does not exist';
    END IF;
END $$;

COMMIT;

-- Verification
SELECT 'Cleanup completed successfully' as status;