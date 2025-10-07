require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testSearch() {
  try {
    const ticketNumber = 'TXN-SAMPLE-001';
    
    console.log('Testing search for ticket:', ticketNumber);
    
    const result = await pool.query(`
      SELECT pt.*, 
             t.transaction_number, t.pawner_id, t.principal_amount, t.interest_rate,
             t.interest_amount, t.penalty_amount, t.service_charge, t.total_amount,
             t.maturity_date, t.grace_period_date, t.expiry_date, t.transaction_date, t.granted_date, t.status as transaction_status,
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
    
    if (result.rows.length === 0) {
      console.log('❌ No transaction found');
      return;
    }
    
    const row = result.rows[0];
    console.log('\n✅ Transaction found!');
    console.log('\n📅 Date fields:');
    console.log('  Transaction Date:', row.transaction_date);
    console.log('  Granted Date:', row.granted_date);
    console.log('  Maturity Date:', row.maturity_date);
    console.log('  Grace Period Date:', row.grace_period_date, row.grace_period_date ? '✅' : '❌ MISSING!');
    console.log('  Expiry Date:', row.expiry_date);
    
    // Test the date formatting
    const formatDateForResponse = (dateValue, isDateOnly = false) => {
      if (!dateValue) return null;
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        if (isDateOnly) {
          return date.toISOString().split('T')[0];
        }
        return date.toISOString();
      } catch (error) {
        console.error('Date formatting error:', error.message);
        return null;
      }
    };
    
    const gracePeriodDateStr = row.grace_period_date ? formatDateForResponse(row.grace_period_date, true) : null;
    console.log('\n🔄 Formatted grace period date:', gracePeriodDateStr, gracePeriodDateStr ? '✅' : '❌ NULL!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testSearch();
