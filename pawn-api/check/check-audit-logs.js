const { pool } = require('../config/database');

async function checkAuditLogs() {
  try {
    console.log('🔍 Checking audit logs for login activities...\n');
    
    const result = await pool.query(`
      SELECT id, user_id, action, description, ip_address, user_agent, created_at
      FROM audit_logs 
      WHERE action LIKE '%login%' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${result.rows.length} login-related audit entries:`);
    console.log('=' .repeat(80));
    
    if (result.rows.length === 0) {
      console.log('No login audit entries found.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. [${row.created_at.toISOString()}]`);
        console.log(`   User ID: ${row.user_id || 'N/A'}`);
        console.log(`   Action: ${row.action}`);
        console.log(`   Description: ${row.description}`);
        console.log(`   IP Address: ${row.ip_address || 'N/A'}`);
        console.log(`   User Agent: ${row.user_agent || 'N/A'}`);
        console.log('');
      });
    }
    
    // Also check total audit log count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    console.log(`Total audit log entries: ${countResult.rows[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking audit logs:', error.message);
    process.exit(1);
  }
}

checkAuditLogs();