/**
 * Seed file: Sample Loan Transactions
 * Creates sample loan transactions with various maturity statuses
 * - Loans maturing in 3 days (premature)
 * - Loans maturing in 4 days (premature)
 * - Loans expired 1 month ago (expired)
 * - Loans expired 2 months ago (expired)
 * - Both Jewelry (3% interest) and Appliances (6% interest)
 * - Loan amount: ₱2,700 for all
 */

exports.seed = async function(knex) {
  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to add/subtract days
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Helper function to add/subtract months
  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  // Get current date
  const today = new Date();
  
  // Define maturity dates (1 month from granted date)
  const scenarios = [
    {
      name: 'Mature in 3 days',
      grantedDate: addDays(today, -27), // 27 days ago (30 days maturity - 3 days remaining)
      maturityDate: addDays(today, 3),
      expiryDate: addDays(today, 3 + 90), // 90 days after maturity
      status: 'active'
    },
    {
      name: 'Mature in 4 days',
      grantedDate: addDays(today, -26), // 26 days ago (30 days maturity - 4 days remaining)
      maturityDate: addDays(today, 4),
      expiryDate: addDays(today, 4 + 90),
      status: 'active'
    },
    {
      name: 'Expired 1 month ago',
      grantedDate: addMonths(today, -3), // 3 months ago
      maturityDate: addMonths(today, -2), // 2 months ago (matured)
      expiryDate: addMonths(today, -1), // 1 month ago (expired)
      status: 'expired'
    },
    {
      name: 'Expired 2 months ago',
      grantedDate: addMonths(today, -4), // 4 months ago
      maturityDate: addMonths(today, -3), // 3 months ago (matured)
      expiryDate: addMonths(today, -2), // 2 months ago (expired)
      status: 'expired'
    }
  ];

  console.log('🔄 Seeding sample loan transactions...');

  // Check if transactions already exist
  const existingTransactions = await knex('transactions')
    .where('transaction_type', 'new_loan')
    .whereIn('transaction_number', [
      'TXN-SAMPLE-001', 'TXN-SAMPLE-002', 'TXN-SAMPLE-003', 'TXN-SAMPLE-004',
      'TXN-SAMPLE-005', 'TXN-SAMPLE-006', 'TXN-SAMPLE-007', 'TXN-SAMPLE-008'
    ]);

  if (existingTransactions.length > 0) {
    console.log('⚠️  Sample loan transactions already exist. Skipping...');
    return;
  }

  // Get required data
  const [jewelryCategory] = await knex('categories').where('name', 'Jewelry').select('id', 'interest_rate');
  const [appliancesCategory] = await knex('categories').where('name', 'Appliances').select('id', 'interest_rate');
  const [mainBranch] = await knex('branches').where('name', 'Main Branch').select('id');
  const [cashier1] = await knex('employees').where('username', 'cashier1').select('id');
  const [butuanCity] = await knex('cities').where('name', 'LIKE', '%Butuan%').select('id');
  const [barangay] = await knex('barangays').where('city_id', butuanCity.id).limit(1).select('id');
  
  // Get item descriptions
  const [goldRing] = await knex('descriptions').where({ category_id: jewelryCategory.id, description: 'Gold Ring' }).select('id');
  const [smartphone] = await knex('descriptions').where({ category_id: appliancesCategory.id, description: 'Smartphone' }).select('id');

  if (!jewelryCategory || !appliancesCategory || !mainBranch || !cashier1 || !butuanCity || !barangay) {
    console.log('❌ Required seed data not found. Please run previous seeds first.');
    return;
  }

  let transactionCount = 0;
  let pawnerIdCounter = 100; // Start from 100 to avoid conflicts with real data

  // Create 2 transactions for each scenario (1 Jewelry, 1 Appliances)
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    
    // Transaction 1: Jewelry
    const jewelryPawnerId = pawnerIdCounter++;
    const jewelryTransactionNumber = `TXN-SAMPLE-${String((i * 2) + 1).padStart(3, '0')}`;
    const jewelryTicketNumber = `PT-SAMPLE-${String((i * 2) + 1).padStart(3, '0')}`;
    
    // Calculate interest and service charge for Jewelry
    const jewelryPrincipal = 2700;
    const jewelryInterestRate = jewelryCategory.interest_rate; // 3%
    const jewelryInterestAmount = Math.round(jewelryPrincipal * (jewelryInterestRate / 100));
    const jewelryServiceCharge = 5; // Minimum service charge
    const jewelryTotalAmount = jewelryPrincipal + jewelryInterestAmount + jewelryServiceCharge;

    // Insert pawner
    await knex('pawners').insert({
      id: jewelryPawnerId,
      first_name: `Sample${jewelryPawnerId}`,
      last_name: `Pawner`,
      mobile_number: `09${String(jewelryPawnerId).padStart(9, '0')}`,
      city_id: butuanCity.id,
      barangay_id: barangay.id,
      street: `${scenario.name} - Jewelry`,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    // Insert transaction
    const [jewelryTransaction] = await knex('transactions').insert({
      transaction_number: jewelryTransactionNumber,
      transaction_type: 'new_loan',
      pawner_id: jewelryPawnerId,
      branch_id: mainBranch.id,
      created_by: cashier1.id,
      principal_amount: jewelryPrincipal,
      interest_rate: jewelryInterestRate,
      interest_amount: jewelryInterestAmount,
      service_charge: jewelryServiceCharge,
      total_amount: jewelryTotalAmount,
      amount_paid: 0,
      balance: jewelryTotalAmount,
      status: scenario.status,
      granted_date: formatDate(scenario.grantedDate),
      transaction_date: formatDate(scenario.grantedDate),
      maturity_date: formatDate(scenario.maturityDate),
      expiry_date: formatDate(scenario.expiryDate),
      notes: `Sample ${scenario.name} - Jewelry`,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }).returning('id');

    const jewelryTransactionId = jewelryTransaction?.id || jewelryTransaction;

    // Insert pawn ticket
    await knex('pawn_tickets').insert({
      ticket_number: jewelryTicketNumber,
      transaction_id: jewelryTransactionId,
      status: scenario.status,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    // Insert pawn item
    await knex('pawn_items').insert({
      transaction_id: jewelryTransactionId,
      category_id: jewelryCategory.id,
      description_id: goldRing?.id || null,
      appraisal_notes: 'Gold Ring - 18K',
      appraised_value: jewelryPrincipal,
      loan_amount: jewelryPrincipal,
      status: 'in_vault',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    transactionCount++;
    console.log(`✅ Created: ${jewelryTicketNumber} - ${scenario.name} (Jewelry)`);

    // Transaction 2: Appliances
    const appliancesPawnerId = pawnerIdCounter++;
    const appliancesTransactionNumber = `TXN-SAMPLE-${String((i * 2) + 2).padStart(3, '0')}`;
    const appliancesTicketNumber = `PT-SAMPLE-${String((i * 2) + 2).padStart(3, '0')}`;
    
    // Calculate interest and service charge for Appliances
    const appliancesPrincipal = 2700;
    const appliancesInterestRate = appliancesCategory.interest_rate; // 6%
    const appliancesInterestAmount = Math.round(appliancesPrincipal * (appliancesInterestRate / 100));
    const appliancesServiceCharge = 5; // Minimum service charge
    const appliancesTotalAmount = appliancesPrincipal + appliancesInterestAmount + appliancesServiceCharge;

    // Insert pawner
    await knex('pawners').insert({
      id: appliancesPawnerId,
      first_name: `Sample${appliancesPawnerId}`,
      last_name: `Pawner`,
      mobile_number: `09${String(appliancesPawnerId).padStart(9, '0')}`,
      city_id: butuanCity.id,
      barangay_id: barangay.id,
      street: `${scenario.name} - Appliances`,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    // Insert transaction
    const [appliancesTransaction] = await knex('transactions').insert({
      transaction_number: appliancesTransactionNumber,
      transaction_type: 'new_loan',
      pawner_id: appliancesPawnerId,
      branch_id: mainBranch.id,
      created_by: cashier1.id,
      principal_amount: appliancesPrincipal,
      interest_rate: appliancesInterestRate,
      interest_amount: appliancesInterestAmount,
      service_charge: appliancesServiceCharge,
      total_amount: appliancesTotalAmount,
      amount_paid: 0,
      balance: appliancesTotalAmount,
      status: scenario.status,
      granted_date: formatDate(scenario.grantedDate),
      transaction_date: formatDate(scenario.grantedDate),
      maturity_date: formatDate(scenario.maturityDate),
      expiry_date: formatDate(scenario.expiryDate),
      notes: `Sample ${scenario.name} - Appliances`,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }).returning('id');

    const appliancesTransactionId = appliancesTransaction?.id || appliancesTransaction;

    // Insert pawn ticket
    await knex('pawn_tickets').insert({
      ticket_number: appliancesTicketNumber,
      transaction_id: appliancesTransactionId,
      status: scenario.status,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    // Insert pawn item
    await knex('pawn_items').insert({
      transaction_id: appliancesTransactionId,
      category_id: appliancesCategory.id,
      description_id: smartphone?.id || null,
      appraisal_notes: 'Smartphone - Samsung Galaxy',
      appraised_value: appliancesPrincipal,
      loan_amount: appliancesPrincipal,
      status: 'in_vault',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    transactionCount++;
    console.log(`✅ Created: ${appliancesTicketNumber} - ${scenario.name} (Appliances)`);
  }

  console.log('');
  console.log('✅ Sample loan transactions seeded successfully!');
  console.log(`   - ${transactionCount} transactions created`);
  console.log(`   - ${transactionCount} pawn tickets created`);
  console.log(`   - ${transactionCount} pawn items created`);
  console.log('');
  console.log('📊 Summary:');
  console.log('   - Mature in 3 days: 2 transactions (1 Jewelry, 1 Appliances)');
  console.log('   - Mature in 4 days: 2 transactions (1 Jewelry, 1 Appliances)');
  console.log('   - Expired 1 month ago: 2 transactions (1 Jewelry, 1 Appliances)');
  console.log('   - Expired 2 months ago: 2 transactions (1 Jewelry, 1 Appliances)');
  console.log('');
  console.log('💰 Loan Details:');
  console.log('   - Principal: ₱2,700');
  console.log('   - Jewelry Interest (3%): ₱81');
  console.log('   - Appliances Interest (6%): ₱162');
  console.log('   - Service Charge: ₱5');
  console.log('   - Jewelry Total: ₱2,786');
  console.log('   - Appliances Total: ₱2,867');
};
