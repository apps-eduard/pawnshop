const { pool } = require('./config/database');

async function testTransactionSearch() {
  try {
    console.log('🔍 Testing transaction search for TXN-202510-000001...');
    
    // First check if the transaction exists in transactions table
    const transactionResult = await pool.query(`
      SELECT t.*, 
             p.first_name, p.last_name, p.mobile_number,
             COUNT(pi.id) as item_count
      FROM transactions t
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN pawn_items pi ON t.id = pi.transaction_id
      WHERE t.transaction_number = $1
      GROUP BY t.id, p.first_name, p.last_name, p.mobile_number
    `, ['TXN-202510-000001']);
    
    console.log(`Found ${transactionResult.rows.length} transactions in transactions table`);
    
    if (transactionResult.rows.length > 0) {
      const txn = transactionResult.rows[0];
      console.log('Transaction details:', {
        id: txn.id,
        transaction_number: txn.transaction_number,
        transaction_type: txn.transaction_type,
        status: txn.status,
        principal_amount: txn.principal_amount,
        pawner_name: `${txn.first_name} ${txn.last_name}`,
        item_count: txn.item_count
      });
    }
    
    // Now check pawn_tickets table
    const ticketResult = await pool.query(`
      SELECT pt.*, t.transaction_number
      FROM pawn_tickets pt
      LEFT JOIN transactions t ON pt.transaction_id = t.id
      WHERE pt.ticket_number = $1 OR t.transaction_number = $1
    `, ['TXN-202510-000001']);
    
    console.log(`Found ${ticketResult.rows.length} records in pawn_tickets table`);
    
    if (ticketResult.rows.length > 0) {
      const ticket = ticketResult.rows[0];
      console.log('Pawn ticket details:', {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        transaction_number: ticket.transaction_number,
        status: ticket.status,
        transaction_id: ticket.transaction_id
      });
    }
    
    // Let's also check what transactions we do have
    const allTransactions = await pool.query(`
      SELECT t.transaction_number, t.status, t.transaction_type, t.created_at
      FROM transactions t
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Recent transactions:');
    allTransactions.rows.forEach(txn => {
      console.log(`  ${txn.transaction_number} | ${txn.status} | ${txn.transaction_type} | ${txn.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing transaction search:', error);
  } finally {
    process.exit();
  }
}

testTransactionSearch();