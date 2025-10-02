-- Update branch_sync_log constraint to allow 'manual' sync type
ALTER TABLE branch_sync_log DROP CONSTRAINT IF EXISTS branch_sync_log_sync_type_check;
ALTER TABLE branch_sync_log ADD CONSTRAINT branch_sync_log_sync_type_check 
  CHECK (sync_type IN ('push', 'pull', 'full', 'manual'));

-- Add a sample 'manual' sync log entry to test  
INSERT INTO branch_sync_log (
  source_branch_id, target_branch_id, sync_type, table_name, 
  records_synced, status, started_at, completed_at, sync_data
) VALUES 
(1, NULL, 'manual', 'multiple', 0, 'completed', NOW(), NOW() + INTERVAL '2 seconds', '{"triggered_by": 1}')
ON CONFLICT DO NOTHING;

SELECT 'Constraint updated and manual sync log added successfully!' as message;