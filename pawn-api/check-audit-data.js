const { pool } = require('./config/database');

async function checkAuditData() {
  try {
    console.log('=== CHECKING AUDIT TABLES ===\n');
    
    // Check audit_logs
    console.log('📊 AUDIT_LOGS Table:');
    const logsResult = await pool.query(`
      SELECT id, username, action, table_name, created_at 
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (logsResult.rows.length === 0) {
      console.log('  ❌ No data found in audit_logs table\n');
    } else {
      console.log(`  ✅ Found ${logsResult.rows.length} records:`);
      logsResult.rows.forEach(row => {
        console.log(`    - ID: ${row.id}, User: ${row.username}, Action: ${row.action}, Table: ${row.table_name}, Date: ${row.created_at}`);
      });
      console.log('');
    }
    
    // Check audit_trails
    console.log('📊 AUDIT_TRAILS Table:');
    const trailsResult = await pool.query(`
      SELECT id, loan_number, username, action_type, amount, created_at 
      FROM audit_trails 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (trailsResult.rows.length === 0) {
      console.log('  ❌ No data found in audit_trails table\n');
    } else {
      console.log(`  ✅ Found ${trailsResult.rows.length} records:`);
      trailsResult.rows.forEach(row => {
        console.log(`    - ID: ${row.id}, Loan: ${row.loan_number}, User: ${row.username}, Action: ${row.action_type}, Amount: ${row.amount}, Date: ${row.created_at}`);
      });
      console.log('');
    }
    
    // Check today's data
    console.log('📅 TODAY\'S DATA:');
    const today = new Date().toISOString().split('T')[0];
    
    const todayLogs = await pool.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE DATE(created_at) = $1
    `, [today]);
    console.log(`  Audit Logs (today): ${todayLogs.rows[0].count}`);
    
    const todayTrails = await pool.query(`
      SELECT COUNT(*) as count 
      FROM audit_trails 
      WHERE DATE(created_at) = $1
    `, [today]);
    console.log(`  Audit Trails (today): ${todayTrails.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAuditData();
