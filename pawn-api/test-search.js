const { pool } = require('./config/database');

async function testSearch() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing transaction search...');
    
    const ticketNumber = 'PT-2024-002';
    console.log(`Searching for ticket: ${ticketNumber}`);
    
    const result = await client.query(`
      SELECT pt.*, 
             p.first_name, p.last_name, p.contact_number, p.email,
             p.city_id, p.barangay_id, p.address_details,
             c.name as city_name, b.name as barangay_name,
             u.first_name as cashier_first_name, u.last_name as cashier_last_name,
             br.name as branch_name
      FROM pawn_tickets pt
      JOIN pawners p ON pt.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      LEFT JOIN branches br ON pt.branch_id = br.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.ticket_number = $1 AND pt.status IN ('active', 'matured')
    `, [ticketNumber]);
    
    if (result.rows.length === 0) {
      console.log('❌ No transaction found');
      return;
    }
    
    // Get items for this ticket
    const itemsResult = await client.query(`
      SELECT * FROM pawn_items WHERE ticket_id = $1 ORDER BY id
    `, [result.rows[0].id]);
    
    const row = result.rows[0];
    console.log('\n📄 Raw database row:');
    console.log(JSON.stringify(row, null, 2));
    
    console.log('\n📦 Items data:');
    console.log(JSON.stringify(itemsResult.rows, null, 2));
    
    // Show the API response structure
    const apiResponse = {
      success: true,
      message: 'Transaction found successfully',
      data: {
        id: row.id,
        ticketNumber: row.ticket_number,
        transactionNumber: row.ticket_number,
        pawnerId: row.pawner_id,
        branchId: row.branch_id,
        createdBy: row.created_by,
        transactionType: row.transaction_type,
        transactionDate: row.transaction_date,
        loanDate: row.loan_date,
        dateGranted: row.loan_date,
        maturityDate: row.maturity_date,
        dateMatured: row.maturity_date,
        expiryDate: row.expiry_date,
        dateExpired: row.expiry_date,
        principalAmount: parseFloat(row.principal_amount || 0),
        principalLoan: parseFloat(row.principal_amount || 0),
        interestRate: parseFloat(row.interest_rate || 0),
        interestAmount: parseFloat(row.interest_amount || 0),
        serviceCharge: parseFloat(row.service_charge || 0),
        netProceeds: parseFloat(row.net_proceeds || 0),
        totalAmount: parseFloat(row.total_amount || 0),
        paymentAmount: parseFloat(row.payment_amount || 0),
        balanceRemaining: parseFloat(row.balance_remaining || 0),
        dueAmount: parseFloat(row.due_amount || 0),
        additionalAmount: parseFloat(row.additional_amount || 0),
        renewalFee: parseFloat(row.renewal_fee || 0),
        penaltyAmount: parseFloat(row.penalty_amount || 0),
        penalty: parseFloat(row.penalty_amount || 0),
        status: row.status,
        loanStatus: row.status,
        redeemedDate: row.redeemed_date,
        renewedDate: row.renewed_date,
        defaultedDate: row.defaulted_date,
        parentTicketId: row.parent_ticket_id,
        approvedBy: row.approved_by,
        notes: row.notes,
        reason: row.reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Pawner information
        pawnerName: `${row.first_name} ${row.last_name}`,
        firstName: row.first_name,
        lastName: row.last_name,
        pawnerContact: row.contact_number,
        contactNumber: row.contact_number,
        pawnerEmail: row.email,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        completeAddress: row.address_details,
        // Branch information
        branchName: row.branch_name,
        // Cashier information
        cashierName: `${row.cashier_first_name} ${row.cashier_last_name}`,
        // Items
        items: itemsResult.rows.map(item => ({
          id: item.id,
          category: item.category,
          categoryDescription: item.category_description,
          description: item.description,
          itemsDescription: item.description,
          appraisalValue: parseFloat(item.appraisal_value || 0),
          estimatedValue: parseFloat(item.estimated_value || 0)
        }))
      }
    };
    
    console.log('\n🚀 API Response Structure:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing search:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testSearch();
    process.exit(0);
  } catch (error) {
    console.error('Failed to test search:', error);
    process.exit(1);
  }
}

main();