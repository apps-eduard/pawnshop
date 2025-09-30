const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runUpdateMigration() {
  try {
    console.log('🔄 Starting admin settings update migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'update_admin_settings.sql');
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
    
    console.log('✅ Admin settings update migration completed successfully!');
    
    // Verify data
    const categoriesResult = await pool.query('SELECT name, interest_rate FROM categories ORDER BY name');
    console.log('📂 Categories:', categoriesResult.rows);
    
    const branchesResult = await pool.query('SELECT name, code, phone, email FROM branches LIMIT 3');
    console.log('🏢 Branches:', branchesResult.rows);
    
    const voucherResult = await pool.query('SELECT code, type FROM voucher_types ORDER BY code');
    console.log('🧾 Voucher Types:', voucherResult.rows);
    
    const loanRulesResult = await pool.query('SELECT * FROM loan_rules ORDER BY id DESC LIMIT 1');
    console.log('⚙️ Loan Rules:', loanRulesResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runUpdateMigration();