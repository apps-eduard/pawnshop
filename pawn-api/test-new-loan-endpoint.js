const { pool } = require('./config/database');

async function testNewLoanEndpoint() {
  try {
    console.log('🧪 Testing new loan transaction endpoint...\n');
    
    // Test getting appraisal for transaction (what happens when you click)
    const appraisalId = 1;
    
    console.log(`1️⃣ Testing GET /api/appraisals/${appraisalId}/for-transaction`);
    
    const result = await pool.query(`
      SELECT a.*, 
             p.first_name, p.last_name, p.contact_number, p.email, p.id_type, p.id_number, p.birth_date,
             p.city_id, p.barangay_id, p.address_details, p.address as full_address,
             c.name as city_name, b.name as barangay_name,
             u.first_name as appraiser_first_name, u.last_name as appraiser_last_name
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      LEFT JOIN cities c ON p.city_id = c.id
      LEFT JOIN barangays b ON p.barangay_id = b.id
      JOIN users u ON a.appraiser_id = u.id
      WHERE a.id = $1 AND a.status = 'completed'
    `, [appraisalId]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      
      console.log('✅ Appraisal found for transaction');
      console.log('\n📋 PAWNER DETAILS (for new loan page):');
      console.log(`   Full Name: ${row.first_name} ${row.last_name}`);
      console.log(`   Contact: ${row.contact_number}`);
      console.log(`   Email: ${row.email || 'N/A'}`);
      console.log(`   ID: ${row.id_type || 'N/A'} - ${row.id_number || 'N/A'}`);
      console.log(`   Address: ${row.city_name || 'N/A'}, ${row.barangay_name || 'N/A'}`);
      
      console.log('\n💍 ITEM DETAILS (for new loan page):');
      console.log(`   Item Type: ${row.item_type || row.description}`);
      console.log(`   Category: ${row.item_category}`);
      console.log(`   Brand: ${row.brand || 'N/A'}`);
      console.log(`   Model: ${row.model || 'N/A'}`);
      console.log(`   Weight: ${row.weight || 'N/A'}g`);
      console.log(`   Karat: ${row.karat || 'N/A'}`);
      console.log(`   Appraised Value: ₱${row.estimated_value}`);
      console.log(`   Interest Rate: ${row.interest_rate}%`);
      console.log(`   Appraiser: ${row.appraiser_first_name} ${row.appraiser_last_name}`);
      
      console.log('\n2️⃣ Testing transaction creation simulation...');
      
      // Simulate calculation
      const appraisalValue = parseFloat(row.estimated_value);
      const principalLoan = appraisalValue * 0.8; // 80% of appraised value
      const interestRate = parseFloat(row.interest_rate);
      const advanceInterest = principalLoan * (interestRate / 100) * 4; // 4 months
      const serviceCharge = 50.00;
      const netProceed = principalLoan - advanceInterest - serviceCharge;
      
      console.log('💰 NEW LOAN COMPUTATION:');
      console.log(`   Appraisal Value: ₱${appraisalValue.toFixed(2)}`);
      console.log(`   Principal Loan (80%): ₱${principalLoan.toFixed(2)}`);
      console.log(`   Interest Rate: ${interestRate}%`);
      console.log(`   Advance Interest (4 months): ₱${advanceInterest.toFixed(2)}`);
      console.log(`   Service Charge: ₱${serviceCharge.toFixed(2)}`);
      console.log(`   Net Proceed: ₱${netProceed.toFixed(2)}`);
      
      console.log('\n🔗 FRONTEND INTEGRATION:');
      console.log(`   API Call: GET /api/appraisals/${appraisalId}/for-transaction`);
      console.log(`   Click handler: onClick={() => router.navigate(['/transaction/new-loan', ${appraisalId}])}`);
      console.log(`   Transaction API: POST /api/transactions/new-loan/${appraisalId}`);
      
    } else {
      console.log('❌ No completed appraisal found');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

testNewLoanEndpoint();