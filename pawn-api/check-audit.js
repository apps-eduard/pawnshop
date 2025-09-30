const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db', 
  user: 'postgres',
  password: '123'
});

async function checkAuditFunction() {
  try {
    // Check if audit trail function exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'log_audit_trail'
      ) as function_exists
    `);
    
    console.log('log_audit_trail function exists:', result.rows[0].function_exists);
    
    // Check if audit_trail table exists
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_trail'
      ) as table_exists
    `);
    
    console.log('audit_trail table exists:', tableResult.rows[0].table_exists);
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkAuditFunction();