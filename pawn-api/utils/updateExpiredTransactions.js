const { pool } = require('../config/database');

/**
 * Updates transaction status to 'expired' for all transactions past their expiry date
 * that are still marked as 'active'
 */
async function updateExpiredTransactions() {
  try {
    const result = await pool.query(`
      UPDATE transactions
      SET 
        status = 'expired',
        updated_at = CURRENT_TIMESTAMP
      WHERE expiry_date < CURRENT_DATE
        AND status = 'active'
      RETURNING id, transaction_number
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Updated ${result.rows.length} transactions to 'expired' status`);
      result.rows.forEach(row => {
        console.log(`   - ${row.transaction_number} (ID: ${row.id})`);
      });
    }
    
    return result.rows.length;
  } catch (error) {
    console.error('❌ Error updating expired transactions:', error.message);
    throw error;
  }
}

module.exports = { updateExpiredTransactions };
