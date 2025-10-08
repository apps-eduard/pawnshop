const { pool } = require('./config/database');

async function showChain() {
  try {
    const result = await pool.query(`
      SELECT 
        transaction_number, 
        tracking_number, 
        previous_transaction_number, 
        transaction_type, 
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM transactions 
      WHERE tracking_number = 'TXN-202510-000014'
      ORDER BY created_at ASC
    `);
    
    console.log('\n📊 Transaction Chain for tracking_number: TXN-202510-000014\n');
    console.table(result.rows);
    
    if (result.rows.length > 0) {
      const latest = result.rows[result.rows.length - 1];
      console.log('\n✅ LATEST TRANSACTION:', latest.transaction_number);
      console.log('🔗 TRACKING NUMBER:', latest.tracking_number);
      
      result.rows.forEach((row, index) => {
        if (index < result.rows.length - 1) {
          console.log(`\n⚠️  SUPERSEDED: ${row.transaction_number} (cannot be renewed)`);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showChain();
