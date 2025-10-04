const { pool } = require('./config/database');

async function checkAuditTableStructure() {
  try {
    console.log('🔍 Checking audit_logs table structure...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      ORDER BY ordinal_position
    `);
    
    console.log('audit_logs table columns:');
    console.log('=' .repeat(50));
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    console.log('\n🔍 Sample data from audit_logs:');
    console.log('=' .repeat(50));
    
    const sampleData = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 3');
    if (sampleData.rows.length === 0) {
      console.log('No data found in audit_logs table');
    } else {
      sampleData.rows.forEach((row, index) => {
        console.log(`Entry ${index + 1}:`, JSON.stringify(row, null, 2));
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAuditTableStructure();