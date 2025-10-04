const { pool } = require('./config/database');

async function checkAuditTables() {
  try {
    console.log('Checking audit_logs table structure...');
    const auditLogsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('audit_logs columns:');
    auditLogsStructure.rows.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\nChecking audit_trails table structure...');
    const auditTrailsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_trails' 
      ORDER BY ordinal_position;
    `);
    
    console.log('audit_trails columns:');
    auditTrailsStructure.rows.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\nChecking for login-related audit entries...');
    const loginLogs = await pool.query(`
      SELECT * FROM audit_logs 
      WHERE action ILIKE '%login%' OR details ILIKE '%login%'
      ORDER BY created_at DESC LIMIT 5
    `);
    
    console.log('Login-related audit_logs entries:', loginLogs.rows.length);
    loginLogs.rows.forEach((log, i) => {
      console.log(`${i+1}. Action: ${log.action}, User: ${log.user_id}, Details: ${log.details}, Date: ${log.created_at}`);
    });

    const loginTrails = await pool.query(`
      SELECT * FROM audit_trails 
      WHERE action ILIKE '%login%' OR details ILIKE '%login%'
      ORDER BY created_at DESC LIMIT 5
    `);
    
    console.log('\nLogin-related audit_trails entries:', loginTrails.rows.length);
    loginTrails.rows.forEach((trail, i) => {
      console.log(`${i+1}. Action: ${trail.action}, User: ${trail.user_id}, Details: ${trail.details}, Date: ${trail.created_at}`);
    });

    console.log('\nChecking employees table for last_login field...');
    const empStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name LIKE '%login%'
      ORDER BY ordinal_position;
    `);
    
    console.log('employees login-related columns:');
    empStructure.rows.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAuditTables();