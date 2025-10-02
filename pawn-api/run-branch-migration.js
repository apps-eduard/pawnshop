const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function runMigration() {
  try {
    console.log('🔄 Running branch configuration migration...');
    const sql = fs.readFileSync('./migrations/branch_configuration.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Branch configuration migration completed successfully');
    
    // Verify the setup
    const result = await pool.query('SELECT * FROM system_config ORDER BY config_key');
    console.log('\n📋 Current System Configuration:');
    result.rows.forEach(row => {
      console.log(`- ${row.config_key}: ${row.config_value}`);
    });
    
    // Check current branch info
    const branchInfo = await pool.query('SELECT * FROM current_branch_info');
    if (branchInfo.rows.length > 0) {
      console.log('\n🏢 Current Branch Information:');
      console.log(`- Branch: ${branchInfo.rows[0].name} (ID: ${branchInfo.rows[0].id})`);
      console.log(`- Address: ${branchInfo.rows[0].address}`);
      console.log(`- Installation Type: ${branchInfo.rows[0].installation_type || 'Not set'}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();