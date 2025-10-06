const { pool } = require('./config/database');

async function checkBalance() {
  try {
    const result = await pool.query(`
      SELECT transaction_number, principal_amount, balance, amount_paid, total_amount
      FROM transactions 
      WHERE transaction_number = $1
    `, ['TXN-202510-000007']);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('✅ Ticket TXN-202510-000007:');
      console.log('  Original Principal:', row.principal_amount);
      console.log('  Current Balance:', row.balance);
      console.log('  Amount Paid:', row.amount_paid);
      console.log('  Total Amount (original):', row.total_amount);
      console.log('');
      console.log('🎯 For redemption, should use Balance:', row.balance);
      console.log('   NOT Principal:', row.principal_amount);
    } else {
      console.log('❌ Ticket not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkBalance();
