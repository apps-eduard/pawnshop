const { pool } = require('./config/database');

async function testCashierWorkflow() {
  try {
    console.log('🧪 Testing Cashier Workflow...\n');
    
    // Step 1: Get pending appraisals ready for transaction (simplified display)
    console.log('1️⃣ Testing Pending Appraisals Display (Cashier Dashboard)...');
    const pendingAppraisals = await pool.query(`
      SELECT a.id, 
             CONCAT(p.first_name, ' ', p.last_name) as pawner_name,
             COALESCE(a.item_category_description, a.item_category) as item_category_description,
             a.estimated_value as total_appraised_value
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.status = 'completed'
      AND a.id NOT IN (
        SELECT DISTINCT appraisal_id 
        FROM transactions 
        WHERE appraisal_id IS NOT NULL
      )
      ORDER BY a.created_at DESC
    `);
    
    console.log(`✅ Found ${pendingAppraisals.rows.length} pending appraisals ready for transaction:`);
    console.log('📋 Display format for Cashier Dashboard:');
    console.log('┌─────┬─────────────────────┬──────────────────────┬─────────────────┐');
    console.log('│ ID  │ Pawner Name         │ Item Category Desc   │ Total Value     │');
    console.log('├─────┼─────────────────────┼──────────────────────┼─────────────────┤');
    
    pendingAppraisals.rows.forEach(appraisal => {
      console.log(`│ ${String(appraisal.id).padEnd(3)} │ ${appraisal.pawner_name.padEnd(19)} │ ${(appraisal.item_category_description || 'N/A').padEnd(20)} │ ₱${String(appraisal.total_appraised_value).padStart(13)} │`);
    });
    console.log('└─────┴─────────────────────┴──────────────────────┴─────────────────┘');
    
    if (pendingAppraisals.rows.length > 0) {
      const testAppraisalId = pendingAppraisals.rows[0].id;
      
      // Step 2: Test clicking on an appraisal (redirect to new loan transaction)
      console.log(`\n2️⃣ Testing Click on Appraisal ID ${testAppraisalId} → Redirect to New Loan Transaction...`);
      
      const transactionDetails = await pool.query(`
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
      `, [testAppraisalId]);
      
      if (transactionDetails.rows.length > 0) {
        const row = transactionDetails.rows[0];
        
        console.log('✅ New Loan Transaction Page Data:');
        console.log('\n📋 PAWNER DETAILS:');
        console.log(`   Name: ${row.first_name} ${row.last_name}`);
        console.log(`   Contact: ${row.contact_number}`);
        console.log(`   Email: ${row.email || 'N/A'}`);
        console.log(`   ID Type: ${row.id_type || 'N/A'}`);
        console.log(`   ID Number: ${row.id_number || 'N/A'}`);
        console.log(`   Address: ${row.city_name || 'N/A'}, ${row.barangay_name || 'N/A'}`);
        console.log(`   Address Details: ${row.address_details || row.full_address || 'N/A'}`);
        
        console.log('\n💍 ITEM LIST:');
        console.log(`   Category: ${row.item_category}`);
        console.log(`   Description: ${row.item_category_description || row.item_category}`);
        console.log(`   Item Type: ${row.description}`);
        console.log(`   Brand: ${row.brand || 'N/A'}`);
        console.log(`   Model: ${row.model || 'N/A'}`);
        console.log(`   Serial Number: ${row.serial_number || 'N/A'}`);
        console.log(`   Weight: ${row.weight || 'N/A'} grams`);
        console.log(`   Karat: ${row.karat || 'N/A'}`);
        console.log(`   Appraised Value: ₱${row.estimated_value}`);
        console.log(`   Interest Rate: ${row.interest_rate}%`);
        console.log(`   Condition: ${row.condition_notes || 'N/A'}`);
        console.log(`   Appraiser: ${row.appraiser_first_name} ${row.appraiser_last_name}`);
        
        console.log('\n💰 NEW LOAN COMPUTATION (Example):');
        console.log(`   Appraisal Value: ₱${row.estimated_value}`);
        console.log(`   Principal Loan (80%): ₱${(parseFloat(row.estimated_value) * 0.8).toFixed(2)}`);
        console.log(`   Interest Rate: ${row.interest_rate}%`);
        console.log(`   Advance Interest (4 months): ₱${(parseFloat(row.estimated_value) * 0.8 * parseFloat(row.interest_rate) / 100 * 4).toFixed(2)}`);
        console.log(`   Service Charge: ₱50.00`);
        console.log(`   Net Proceed: ₱${(parseFloat(row.estimated_value) * 0.8 - (parseFloat(row.estimated_value) * 0.8 * parseFloat(row.interest_rate) / 100 * 4) - 50).toFixed(2)}`);
      }
    } else {
      console.log('\n⚠️  No completed appraisals available for testing. Creating test data...');
      
      // Update an appraisal to completed status for testing
      await pool.query(`
        UPDATE appraisals 
        SET status = 'completed' 
        WHERE id = (SELECT id FROM appraisals WHERE status = 'pending' LIMIT 1)
      `);
      
      console.log('✅ Updated one appraisal to completed status for testing');
    }
    
    console.log('\n🎯 WORKFLOW SUMMARY:');
    console.log('1. Cashier Dashboard shows: Pawner Name | Item Category Description | Total Appraised Value');
    console.log('2. Click on any row → Redirect to: /transaction/new-loan/:appraisalId');
    console.log('3. New Loan page displays: Complete Pawner Details + Item List + Computation Form');
    console.log('4. Submit creates transaction and marks appraisal as "used"');
    
    await pool.end();
    console.log('\n🎉 Cashier workflow testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing cashier workflow:', error);
    await pool.end();
  }
}

testCashierWorkflow();