const { pool } = require('./config/database');
const { generateTicketNumber } = require('./utils/transactionUtils');

async function testCreateTransactionWithNewNumber() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing transaction creation with new number generation...');
    
    await client.query('BEGIN');
    
    // Create a test pawner
    const pawnerResult = await client.query(`
      INSERT INTO pawners (
        customer_code, first_name, last_name, mobile_number, 
        email, birth_date, gender, civil_status, nationality,
        house_number, street, barangay_id, city_id, province, postal_code,
        id_type, id_number, occupation, monthly_income,
        emergency_contact_name, emergency_contact_number, emergency_contact_relationship,
        is_active, branch_id, created_by, updated_by
      ) VALUES (
        'TEST001', 'John', 'Doe', '09123456789',
        'john@test.com', '1990-01-01', 'Male', 'Single', 'Filipino',
        '123', 'Test Street', 1, 1, 'Cebu', '6000',
        'Drivers License', 'DL123456', 'Engineer', 50000,
        'Jane Doe', '09987654321', 'Sister',
        true, 1, 1, 1
      ) RETURNING id
    `);
    
    const pawnerId = pawnerResult.rows[0].id;
    console.log('✅ Created test pawner:', pawnerId);
    
    // Generate ticket number
    const ticketNumber = await generateTicketNumber(1, 'MAIN');
    console.log('🎫 Generated ticket number:', ticketNumber);
    
    // Create pawn ticket
    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setMonth(maturityDate.getMonth() + 4);
    const expiryDate = new Date(maturityDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    const ticketResult = await client.query(`
      INSERT INTO pawn_tickets (
        ticket_number, pawner_id, branch_id, created_by,
        transaction_type, transaction_date, loan_date, maturity_date, expiry_date,
        status, principal_amount, interest_rate, interest_amount, service_charge, net_proceeds,
        total_amount, due_amount, balance_remaining, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      ticketNumber, pawnerId, 1, 1,
      'new_loan', now, now, maturityDate, expiryDate,
      'active', 10000, 3.0, 300, 100, 9600,
      10400, 10400, 10400, 'Test transaction with new number generation'
    ]);
    
    const ticket = ticketResult.rows[0];
    console.log('✅ Created pawn ticket:', {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      principal_amount: ticket.principal_amount,
      status: ticket.status
    });
    
    // Add a test item
    await client.query(`
      INSERT INTO pawn_items (
        transaction_id, category_id, description_id, custom_description,
        brand, model, serial_number, weight, karat,
        item_condition, appraisal_notes, appraised_value, loan_amount,
        status, appraised_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      ticket.id, 1, 1, 'Test Gold Ring',
      'Test Brand', 'Test Model', 'SN123456', 5.5, '18k',
      'Good', 'Test appraisal notes', 12000, 10000,
      'active', 1
    ]);
    
    console.log('✅ Added test item to ticket');
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Transaction creation test completed successfully!');
    console.log('📋 Summary:');
    console.log('  - Pawner ID:', pawnerId);
    console.log('  - Ticket Number:', ticketNumber);
    console.log('  - Ticket ID:', ticket.id);
    console.log('  - Principal Amount:', ticket.principal_amount);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit();
  }
}

testCreateTransactionWithNewNumber();