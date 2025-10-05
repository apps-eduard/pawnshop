const { pool } = require('./config/database');

async function verifyDatabaseSetup() {
  try {
    console.log('🔍 Verifying Complete Database Setup...\n');
    console.log('=' .repeat(60));
    
    // List of required tables
    const requiredTables = [
      // Admin & Config Tables
      'categories',
      'loan_rules',
      'voucher_types',
      'branches',
      'cities',
      'barangays',
      'descriptions',
      'employees',
      'audit_logs',
      'audit_trails',
      
      // Core Business Tables
      'system_config',
      'transaction_sequences',
      'pawners',
      'transactions',
      'pawn_tickets',
      'pawn_items',
      'item_appraisals',
      'pawn_payments',
      'branch_sync_log',
      
      // Dynamic Config Tables
      'penalty_config',
      'penalty_calculation_log',
      'service_charge_brackets',
      'service_charge_config',
      'service_charge_calculation_log'
    ];
    
    console.log('📋 Checking Required Tables...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    
    // Check each required table
    let allTablesExist = true;
    const missingTables = [];
    
    for (const tableName of requiredTables) {
      if (existingTables.includes(tableName)) {
        console.log(`✅ ${tableName}`);
      } else {
        console.log(`❌ ${tableName} - MISSING`);
        missingTables.push(tableName);
        allTablesExist = false;
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    
    if (allTablesExist) {
      console.log('\n✅ All required tables exist!\n');
    } else {
      console.log(`\n❌ Missing ${missingTables.length} table(s):`);
      missingTables.forEach(table => console.log(`   - ${table}`));
      console.log('\n');
    }
    
    // Check row counts
    console.log('📊 Checking Table Row Counts...\n');
    
    const countChecks = [
      { table: 'categories', min: 2, description: 'Item Categories' },
      { table: 'branches', min: 1, description: 'Branches' },
      { table: 'employees', min: 6, description: 'Employee Accounts' },
      { table: 'cities', min: 10, description: 'Cities' },
      { table: 'barangays', min: 10, description: 'Barangays' },
      { table: 'descriptions', min: 5, description: 'Item Descriptions' },
      { table: 'penalty_config', min: 3, description: 'Penalty Config' },
      { table: 'service_charge_brackets', min: 3, description: 'Service Charge Brackets' }
    ];
    
    let allCountsGood = true;
    
    for (const check of countChecks) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${check.table}`);
        const count = parseInt(countResult.rows[0].count);
        
        if (count >= check.min) {
          console.log(`✅ ${check.description.padEnd(25)} : ${count} rows`);
        } else {
          console.log(`⚠️  ${check.description.padEnd(25)} : ${count} rows (expected at least ${check.min})`);
          allCountsGood = false;
        }
      } catch (error) {
        console.log(`❌ ${check.description.padEnd(25)} : Table not found or error`);
        allCountsGood = false;
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    
    // Check demo accounts
    console.log('\n👥 Verifying Demo Accounts...\n');
    
    const demoAccounts = [
      { username: 'admin', role: 'administrator' },
      { username: 'cashier1', role: 'cashier' },
      { username: 'manager1', role: 'manager' },
      { username: 'auctioneer1', role: 'auctioneer' },
      { username: 'appraiser1', role: 'appraiser' },
      { username: 'pawner1', role: 'pawner' }
    ];
    
    let allAccountsExist = true;
    
    for (const account of demoAccounts) {
      const accountResult = await pool.query(
        'SELECT * FROM employees WHERE username = $1',
        [account.username]
      );
      
      if (accountResult.rows.length > 0) {
        const user = accountResult.rows[0];
        console.log(`✅ ${account.username.padEnd(15)} (${account.role.padEnd(15)}) - ${user.first_name} ${user.last_name}`);
      } else {
        console.log(`❌ ${account.username.padEnd(15)} (${account.role.padEnd(15)}) - MISSING`);
        allAccountsExist = false;
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    
    // Final summary
    console.log('\n📝 VERIFICATION SUMMARY\n');
    
    if (allTablesExist && allCountsGood && allAccountsExist) {
      console.log('✅ Database setup is COMPLETE and ready to use!');
      console.log('✅ All required tables exist');
      console.log('✅ All seed data is present');
      console.log('✅ All demo accounts are configured');
      console.log('\n🎉 You can now start the application!\n');
      console.log('Demo Account Credentials:');
      console.log('  - admin / admin123');
      console.log('  - cashier1 / cashier123');
      console.log('  - manager1 / manager123');
      console.log('  - auctioneer1 / auctioneer123');
      console.log('  - appraiser1 / appraiser123');
      console.log('  - pawner1 / pawner123\n');
    } else {
      console.log('⚠️  Database setup is INCOMPLETE');
      if (!allTablesExist) {
        console.log(`❌ ${missingTables.length} required table(s) missing`);
      }
      if (!allCountsGood) {
        console.log('⚠️  Some tables have insufficient seed data');
      }
      if (!allAccountsExist) {
        console.log('❌ Some demo accounts are missing');
      }
      console.log('\n💡 Try running: npm run setup-db\n');
    }
    
    console.log('=' .repeat(60));
    
    await pool.end();
    process.exit(allTablesExist && allCountsGood && allAccountsExist ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyDatabaseSetup();
