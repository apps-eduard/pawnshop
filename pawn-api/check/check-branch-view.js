const { pool } = require('../config/database');

async function checkBranchView() {
  try {
    console.log('🔍 Checking current_branch_info view...');
    
    // Check if view exists
    const viewResult = await pool.query(`
      SELECT * FROM information_schema.views 
      WHERE table_name = 'current_branch_info'
    `);
    
    console.log('View exists:', viewResult.rows.length > 0);
    
    if (viewResult.rows.length === 0) {
      console.log('❌ current_branch_info view does not exist');
      
      // Try to query system_config instead
      console.log('🔧 Checking system_config...');
      const configResult = await pool.query(`
        SELECT config_key, config_value 
        FROM system_config 
        WHERE config_key = 'current_branch_id'
      `);
      console.log('Current branch config:', configResult.rows);
      
      // Check branches table
      console.log('🏢 Checking branches...');
      const branchesResult = await pool.query('SELECT * FROM branches LIMIT 3');
      console.log('Available branches:', branchesResult.rows);
    } else {
      // Try to query the view
      const result = await pool.query('SELECT * FROM current_branch_info');
      console.log('View content:', result.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkBranchView();