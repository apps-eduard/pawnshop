const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔧 Running audit tables migration...');
    
    const sqlFile = path.join(__dirname, 'migrations', 'fix_audit_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Audit tables migration completed successfully!');
    
    // Verify the new structure
    console.log('\n📋 Verifying audit_logs columns:');
    const logsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='audit_logs' 
      ORDER BY ordinal_position
    `);
    logsColumns.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n📋 Verifying audit_trails columns:');
    const trailsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='audit_trails' 
      ORDER BY ordinal_position
    `);
    trailsColumns.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
