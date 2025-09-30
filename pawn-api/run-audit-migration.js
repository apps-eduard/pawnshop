const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runAuditMigration() {
  try {
    console.log('🔄 Starting audit trail migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'audit_trail.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        console.log('📝 Executing:', trimmed.substring(0, 60) + '...');
        await pool.query(trimmed);
      }
    }
    
    console.log('✅ Audit trail migration completed successfully!');
    
    // Verify audit table
    const auditResult = await pool.query('SELECT COUNT(*) as count FROM admin_audit_log');
    console.log('📊 Audit log entries:', auditResult.rows[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runAuditMigration();