const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function createSampleSyncLogs() {
  try {
    console.log('📊 Creating sample sync log entries...');
    
    // Insert sample sync logs
    await pool.query(`
      INSERT INTO branch_sync_log (
        source_branch_id, target_branch_id, sync_type, table_name, 
        records_synced, status, started_at, completed_at, sync_data
      ) VALUES 
      (1, NULL, 'push', 'pawners', 15, 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds', '{"triggered_by": 1}'),
      (1, NULL, 'push', 'categories', 8, 'completed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '15 seconds', '{"triggered_by": 1}'),
      (1, NULL, 'full', 'multiple', 0, 'completed', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes' + INTERVAL '5 seconds', '{"triggered_by": 1}'),
      (1, NULL, 'push', 'pawners', 5, 'failed', NOW() - INTERVAL '15 minutes', NULL, '{"triggered_by": 1}'),
      (1, NULL, 'pull', 'categories', 12, 'in_progress', NOW() - INTERVAL '5 minutes', NULL, '{"triggered_by": 1}')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Sample sync logs created successfully!');
    
    // Verify the entries
    const result = await pool.query('SELECT COUNT(*) as count FROM branch_sync_log');
    console.log('📋 Total sync log entries:', result.rows[0].count);
    
    // Show recent entries
    const recent = await pool.query(`
      SELECT bsl.*, b.name as branch_name 
      FROM branch_sync_log bsl
      LEFT JOIN branches b ON b.id = bsl.source_branch_id
      ORDER BY bsl.started_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📄 Recent sync logs:');
    recent.rows.forEach(log => {
      console.log(`- ${log.branch_name}: ${log.sync_type} ${log.table_name}, ${log.records_synced} records, ${log.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createSampleSyncLogs();