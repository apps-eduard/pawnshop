const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function applyTrigger() {
  try {
    console.log('📋 Reading SQL migration file...');
    const sqlFile = path.join(__dirname, 'migrations', 'auto_expire_transactions_trigger.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('🔄 Applying database trigger...');
    await pool.query(sql);
    
    console.log('✅ Database trigger applied successfully!');
    console.log('📊 Checking results...');
    
    // Check expired transactions
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM transactions WHERE status = 'expired'
    `);
    
    console.log(`\n✅ Total expired transactions: ${result.rows[0].count}`);
    console.log('\n🎉 Trigger is now active! Transactions will automatically expire.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying trigger:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyTrigger();
