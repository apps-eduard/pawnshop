const { pool } = require('./config/database');

async function testPenaltyAndServiceChargeTables() {
  try {
    console.log('🔍 Testing Penalty and Service Charge Configuration Tables...\n');
    console.log('=' .repeat(70));
    
    // Test 1: Check penalty_config table
    console.log('\n📊 TEST 1: Penalty Configuration Table');
    console.log('-' .repeat(70));
    
    try {
      const penaltyConfigResult = await pool.query('SELECT * FROM penalty_config ORDER BY id');
      console.log(`✅ penalty_config table exists with ${penaltyConfigResult.rows.length} configuration(s):`);
      penaltyConfigResult.rows.forEach(row => {
        console.log(`   • ${row.config_key}: ${row.config_value} - ${row.description}`);
      });
    } catch (error) {
      console.log('❌ penalty_config table not found or error:', error.message);
    }
    
    // Test 2: Check penalty_calculation_log table
    console.log('\n📊 TEST 2: Penalty Calculation Log Table');
    console.log('-' .repeat(70));
    
    try {
      const penaltyLogResult = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'penalty_calculation_log' 
        ORDER BY ordinal_position
      `);
      
      if (penaltyLogResult.rows.length > 0) {
        console.log(`✅ penalty_calculation_log table exists with ${penaltyLogResult.rows.length} columns:`);
        penaltyLogResult.rows.forEach(row => {
          console.log(`   • ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('❌ penalty_calculation_log table not found');
      }
    } catch (error) {
      console.log('❌ Error checking penalty_calculation_log:', error.message);
    }
    
    // Test 3: Check service_charge_brackets table
    console.log('\n📊 TEST 3: Service Charge Brackets Table');
    console.log('-' .repeat(70));
    
    try {
      const serviceBracketsResult = await pool.query(`
        SELECT * FROM service_charge_brackets 
        WHERE is_active = TRUE 
        ORDER BY display_order
      `);
      console.log(`✅ service_charge_brackets table exists with ${serviceBracketsResult.rows.length} bracket(s):`);
      serviceBracketsResult.rows.forEach(row => {
        const maxAmount = row.max_amount ? `₱${row.max_amount}` : 'No limit';
        console.log(`   • ${row.bracket_name}: ₱${row.min_amount} - ${maxAmount} = ₱${row.service_charge}`);
      });
    } catch (error) {
      console.log('❌ service_charge_brackets table not found or error:', error.message);
    }
    
    // Test 4: Check service_charge_config table
    console.log('\n📊 TEST 4: Service Charge Configuration Table');
    console.log('-' .repeat(70));
    
    try {
      const serviceConfigResult = await pool.query('SELECT * FROM service_charge_config ORDER BY id');
      console.log(`✅ service_charge_config table exists with ${serviceConfigResult.rows.length} configuration(s):`);
      serviceConfigResult.rows.forEach(row => {
        console.log(`   • ${row.config_key}: ${row.config_value} - ${row.description}`);
      });
    } catch (error) {
      console.log('❌ service_charge_config table not found or error:', error.message);
    }
    
    // Test 5: Check service_charge_calculation_log table
    console.log('\n📊 TEST 5: Service Charge Calculation Log Table');
    console.log('-' .repeat(70));
    
    try {
      const serviceLogResult = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'service_charge_calculation_log' 
        ORDER BY ordinal_position
      `);
      
      if (serviceLogResult.rows.length > 0) {
        console.log(`✅ service_charge_calculation_log table exists with ${serviceLogResult.rows.length} columns:`);
        serviceLogResult.rows.forEach(row => {
          console.log(`   • ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('❌ service_charge_calculation_log table not found');
      }
    } catch (error) {
      console.log('❌ Error checking service_charge_calculation_log:', error.message);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('\n📝 SUMMARY: Penalty & Service Charge Configuration Tables');
    console.log('-' .repeat(70));
    
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'penalty_config', 
          'penalty_calculation_log',
          'service_charge_brackets',
          'service_charge_config',
          'service_charge_calculation_log'
        )
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'penalty_config',
      'penalty_calculation_log',
      'service_charge_brackets',
      'service_charge_config',
      'service_charge_calculation_log'
    ];
    
    const existingTables = allTables.rows.map(r => r.table_name);
    
    console.log('\n📊 Expected Tables: 5');
    console.log('📊 Found Tables: ' + existingTables.length);
    console.log('');
    
    expectedTables.forEach(tableName => {
      if (existingTables.includes(tableName)) {
        console.log(`✅ ${tableName}`);
      } else {
        console.log(`❌ ${tableName} - MISSING`);
      }
    });
    
    if (existingTables.length === expectedTables.length) {
      console.log('\n🎉 All penalty and service charge configuration tables are present!\n');
    } else {
      console.log(`\n⚠️  WARNING: ${expectedTables.length - existingTables.length} table(s) missing!\n`);
      console.log('💡 Run the following to create missing tables:');
      console.log('   cd pawn-api');
      console.log('   npm run setup-db\n');
    }
    
    console.log('=' .repeat(70));
    
    await pool.end();
    process.exit(existingTables.length === expectedTables.length ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

testPenaltyAndServiceChargeTables();
