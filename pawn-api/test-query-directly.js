const { pool } = require('./config/database');

async function testTransactionSearchQuery() {
  try {
    console.log('🧪 Testing transaction search query directly...\n');
    
    // Test the fixed query
    const ticketNumber = 'TXN-202510-000001';
    
    console.log(`Searching for ticket: ${ticketNumber}`);
    
    const result = await pool.query(`
      SELECT pt.*, 
             t.transaction_number, t.pawner_id, t.principal_amount, t.interest_rate,
             t.interest_amount, t.penalty_amount, t.service_charge, t.total_amount,
             t.maturity_date, t.expiry_date, t.transaction_date, t.status as transaction_status,
             t.balance, t.amount_paid, t.days_overdue,
             p.first_name, p.last_name, p.mobile_number, p.email,
             p.city_id, p.barangay_id, p.house_number, p.street,
             c.name as city_name, b.name as barangay_name,
             e.first_name as cashier_first_name, e.last_name as cashier_last_name,
             br.name as branch_name
      FROM pawn_tickets pt
      JOIN transactions t ON pt.transaction_id = t.id
      JOIN pawners p ON t.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON t.branch_id = br.id
      LEFT JOIN employees e ON t.created_by = e.id
      WHERE pt.ticket_number = $1 AND pt.status IN ('active', 'matured')
    `, [ticketNumber]);
    
    console.log(`✅ Query executed successfully!`);
    console.log(`📊 Found ${result.rows.length} records`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Sample record:');
      const record = result.rows[0];
      console.log(`- Ticket Number: ${record.ticket_number}`);
      console.log(`- Transaction Number: ${record.transaction_number}`);
      console.log(`- Pawner: ${record.first_name} ${record.last_name}`);
      console.log(`- Principal Amount: ₱${record.principal_amount}`);
      console.log(`- Status: ${record.status} (Transaction: ${record.transaction_status})`);
      console.log(`- Maturity Date: ${record.maturity_date}`);
    } else {
      console.log('\n⚠️  No records found for this ticket number');
      
      // Check if ticket exists at all
      const ticketCheck = await pool.query('SELECT * FROM pawn_tickets WHERE ticket_number = $1', [ticketNumber]);
      console.log(`\n🔍 Ticket exists check: ${ticketCheck.rows.length > 0 ? 'YES' : 'NO'}`);
      
      if (ticketCheck.rows.length > 0) {
        console.log(`Ticket status: ${ticketCheck.rows[0].status}`);
        console.log(`Transaction ID: ${ticketCheck.rows[0].transaction_id}`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testTransactionSearchQuery();