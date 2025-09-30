const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runRoleMigration() {
  console.log('🔄 Running role update migration...');
  
  try {
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'update_roles.sql'), 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim() === 'COMMIT') continue;
      console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
      await pool.query(statement);
    }
    
    console.log('✅ Role migration completed successfully!');
    
    // Verify the updates
    const result = await pool.query('SELECT username, role, email FROM users ORDER BY username');
    console.log('\n📋 Updated users:');
    result.rows.forEach(user => {
      console.log(`  ${user.username} (${user.role}) - ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runRoleMigration();