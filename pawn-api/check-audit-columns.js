const { pool } = require('./config/database');

async function checkColumns() {
  try {
    console.log('=== AUDIT_LOGS COLUMNS ===');
    const logs = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='audit_logs' 
      ORDER BY ordinal_position
    `);
    logs.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });

    console.log('\n=== AUDIT_TRAILS COLUMNS ===');
    const trails = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='audit_trails' 
      ORDER BY ordinal_position
    `);
    trails.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
