const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function explainTransactionSystem() {
  try {
    console.log('💰 PAWNSHOP TRANSACTION SYSTEM EXPLANATION\n');
    
    // Check transaction table structure
    console.log('📋 TRANSACTIONS TABLE STRUCTURE:');
    const transactionFields = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position;
    `);
    
    transactionFields.rows.forEach(field => {
      const required = field.is_nullable === 'NO' ? ' (Required)' : ' (Optional)';
      console.log(`  ├─ ${field.column_name}: ${field.data_type}${required}`);
    });
    
    // Show actual transaction data
    console.log('\n💳 ACTUAL TRANSACTION DATA:');
    const transactions = await pool.query(`
      SELECT 
        t.*,
        p.first_name || ' ' || p.last_name as pawner_name,
        b.name as branch_name
      FROM transactions t
      LEFT JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN branches b ON t.branch_id = b.id
      ORDER BY t.created_at DESC
      LIMIT 3;
    `);
    
    transactions.rows.forEach((txn, index) => {
      console.log(`\n  ${index + 1}. TRANSACTION ID: ${txn.id}`);
      console.log(`     ├─ Number: ${txn.transaction_number}`);
      console.log(`     ├─ Type: ${txn.transaction_type}`);
      console.log(`     ├─ Status: ${txn.status}`);
      console.log(`     ├─ Pawner: ${txn.pawner_name || 'Unknown'}`);
      console.log(`     ├─ Branch: ${txn.branch_name || 'Unknown'}`);
      console.log(`     ├─ Principal: ₱${Number(txn.principal_amount).toLocaleString()}`);
      console.log(`     ├─ Interest Rate: ${Number(txn.interest_rate * 100)}% monthly`);
      console.log(`     ├─ Interest Amount: ₱${Number(txn.interest_amount || 0).toLocaleString()}`);
      console.log(`     ├─ Total Amount: ₱${Number(txn.total_amount).toLocaleString()}`);
      console.log(`     ├─ Maturity Date: ${new Date(txn.maturity_date).toLocaleDateString()}`);
      console.log(`     ├─ Expiry Date: ${new Date(txn.expiry_date).toLocaleDateString()}`);
      console.log(`     ├─ Days Overdue: ${txn.days_overdue || 0}`);
      console.log(`     └─ Created: ${new Date(txn.created_at).toLocaleString()}`);
    });
    
    // Show related pawn items
    console.log('\n📦 ITEMS IN TRANSACTIONS:');
    const itemsInTransactions = await pool.query(`
      SELECT 
        t.transaction_number,
        pi.*,
        c.name as category_name,
        d.name as description_name
      FROM transactions t
      JOIN pawn_items pi ON t.id = pi.transaction_id
      LEFT JOIN categories c ON pi.category_id = c.id
      LEFT JOIN descriptions d ON pi.description_id = d.id
      ORDER BY t.id;
    `);
    
    itemsInTransactions.rows.forEach((item, index) => {
      console.log(`\n  ${index + 1}. ITEM IN TRANSACTION: ${item.transaction_number}`);
      console.log(`     ├─ Category: ${item.category_name}`);
      console.log(`     ├─ Description: ${item.description_name}`);
      console.log(`     ├─ Custom Notes: ${item.custom_description || 'None'}`);
      console.log(`     ├─ Condition: ${item.item_condition || 'Not specified'}`);
      console.log(`     ├─ Appraised Value: ₱${Number(item.appraised_value).toLocaleString()}`);
      console.log(`     ├─ Loan Amount: ₱${Number(item.loan_amount).toLocaleString()}`);
      console.log(`     └─ Status: ${item.status}`);
    });
    
    // Show pawn tickets
    console.log('\n🎫 PAWN TICKETS:');
    const tickets = await pool.query(`
      SELECT 
        pt.*,
        t.transaction_number,
        t.status as transaction_status
      FROM pawn_tickets pt
      JOIN transactions t ON pt.transaction_id = t.id
      ORDER BY pt.created_at;
    `);
    
    tickets.rows.forEach((ticket, index) => {
      console.log(`\n  ${index + 1}. TICKET: ${ticket.ticket_number}`);
      console.log(`     ├─ Transaction: ${ticket.transaction_number}`);
      console.log(`     ├─ Status: ${ticket.status}`);
      console.log(`     ├─ Print Count: ${ticket.print_count}`);
      console.log(`     └─ Created: ${new Date(ticket.created_at).toLocaleString()}`);
    });
    
    // Show transaction types and their meanings
    console.log('\n🔄 TRANSACTION TYPES:');
    const transactionTypes = await pool.query(`
      SELECT DISTINCT transaction_type, COUNT(*) as count
      FROM transactions 
      GROUP BY transaction_type
      ORDER BY count DESC;
    `);
    
    transactionTypes.rows.forEach(type => {
      console.log(`  ├─ ${type.transaction_type}: ${type.count} transactions`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

explainTransactionSystem();