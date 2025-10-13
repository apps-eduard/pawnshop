const { pool } = require('../config/database');

async function checkDescriptions() {
  try {
    console.log('🔍 Checking descriptions table...\n');
    
    // Get description #78
    const result = await pool.query(`
      SELECT * FROM descriptions WHERE id = 78
    `);
    
    if (result.rows.length > 0) {
      console.log('📦 Description #78:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ Description #78 not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDescriptions();
