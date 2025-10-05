const { pool } = require('./config/database');

async function testAPISearchRoute() {
  try {
    console.log('🔍 Testing API search route implementation...');
    
    // This simulates what the API route does
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
    
    console.log(`Query returned ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('Main ticket data:', {
        id: row.id,
        ticket_number: row.ticket_number,
        transaction_number: row.transaction_number,
        status: row.status,
        transaction_status: row.transaction_status,
        principal_amount: row.principal_amount,
        pawner_name: `${row.first_name} ${row.last_name}`,
        mobile_number: row.mobile_number
      });
      
      // Get items for this ticket
      const itemsResult = await pool.query(`
        SELECT pi.*,
               cat.name as category_name,
               d.description_name,
               COALESCE(d.description_name, 'No description') as item_description
        FROM pawn_items pi
        LEFT JOIN categories cat ON pi.category_id = cat.id
        LEFT JOIN descriptions d ON pi.description_id = d.id
        WHERE pi.transaction_id = $1 
        ORDER BY pi.id
      `, [row.transaction_id]);
      
      console.log(`Found ${itemsResult.rows.length} items for this transaction`);
      
      if (itemsResult.rows.length > 0) {
        console.log('Items:', itemsResult.rows.map(item => ({
          id: item.id,
          category_name: item.category_name,
          item_description: item.item_description,
          appraised_value: item.appraised_value,
          status: item.status
        })));
      }
    } else {
      console.log('❌ No records found - checking possible reasons...');
      
      // Check if ticket exists but with different status
      const statusCheck = await pool.query(`
        SELECT pt.status, t.status as transaction_status, pt.ticket_number
        FROM pawn_tickets pt
        JOIN transactions t ON pt.transaction_id = t.id
        WHERE pt.ticket_number = $1
      `, [ticketNumber]);
      
      if (statusCheck.rows.length > 0) {
        const statusRow = statusCheck.rows[0];
        console.log('Found ticket but with status:', {
          ticket_status: statusRow.status,
          transaction_status: statusRow.transaction_status,
          expected_statuses: ['active', 'matured']
        });
        
        if (!['active', 'matured'].includes(statusRow.status)) {
          console.log('❌ Ticket status not eligible for redemption');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API search route:', error);
  } finally {
    process.exit();
  }
}

testAPISearchRoute();