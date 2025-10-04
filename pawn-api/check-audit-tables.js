const { pool } = require('./config/database');

async function checkAuditTables() {
  try {
    // Check audit_logs structure
    console.log('=== AUDIT_LOGS Table Structure ===');
    const auditLogsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position;
    `);
    auditLogsResult.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n=== AUDIT_TRAILS Table Structure ===');
    const auditTrailsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'audit_trails'
      ORDER BY ordinal_position;
    `);
    auditTrailsResult.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check sample data from both tables
    console.log('\n=== Sample AUDIT_LOGS Data ===');
    const sampleLogs = await pool.query('SELECT * FROM audit_logs LIMIT 3');
    console.log('Records found:', sampleLogs.rows.length);
    if (sampleLogs.rows.length > 0) {
      console.log('Sample record:', sampleLogs.rows[0]);
    }
    
    console.log('\n=== Sample AUDIT_TRAILS Data ===');
    const sampleTrails = await pool.query('SELECT * FROM audit_trails LIMIT 3');
    console.log('Records found:', sampleTrails.rows.length);
    if (sampleTrails.rows.length > 0) {
      console.log('Sample record:', sampleTrails.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAuditTables();