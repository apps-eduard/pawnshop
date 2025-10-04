const { pool } = require('./config/database');

async function showAllCreatedTables() {
  try {
    console.log('\n🎯 Complete Database Tables Verification');
    console.log('='.repeat(60));
    
    // Get all tables with their row counts
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename,
        (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
      FROM (
        SELECT 
          schemaname,
          tablename,
          query_to_xml(format('select count(*) as cnt from %I.%I', schemaname, tablename), false, true, '') as xml_count
        FROM pg_tables 
        WHERE schemaname = 'public'
      ) t
      ORDER BY tablename;
    `;
    
    console.log('\n📋 All Tables Created with Data Counts:');
    console.log('┌─────────────────────────────┬─────────────┐');
    console.log('│ Table Name                  │ Row Count   │');
    console.log('├─────────────────────────────┼─────────────┤');
    
    const tables = await pool.query(tablesQuery);
    let totalTables = 0;
    
    for (const table of tables.rows) {
      const tableName = table.tablename.padEnd(27);
      const rowCount = table.row_count.toString().padStart(9);
      console.log(`│ ${tableName} │ ${rowCount}   │`);
      totalTables++;
    }
    
    console.log('└─────────────────────────────┴─────────────┘');
    console.log(`\n📊 Summary: ${totalTables} tables created`);
    
    // Show core business tables status
    console.log('\n🏪 Core Business Tables Status:');
    const coreTableChecks = [
      'pawners', 'transactions', 'pawn_items', 'pawn_payments', 
      'pawn_tickets', 'appraisals', 'system_config'
    ];
    
    for (const tableName of coreTableChecks) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const status = result.rows[0].count > 0 ? '✅ Ready with data' : '✅ Ready (empty)';
        console.log(`  • ${tableName}: ${status}`);
      } catch (error) {
        console.log(`  • ${tableName}: ❌ ERROR - ${error.message}`);
      }
    }
    
    // Show authentication system status
    console.log('\n🔐 Authentication System:');
    try {
      const employees = await pool.query(`
        SELECT username, role, position 
        FROM employees 
        WHERE is_active = true 
        ORDER BY id
      `);
      
      console.log(`  • ${employees.rows.length} active employees ready:`);
      employees.rows.forEach(emp => {
        console.log(`    - ${emp.username} (${emp.role})`);
      });
    } catch (error) {
      console.log(`  • ❌ Authentication ERROR: ${error.message}`);
    }
    
    // Show geographic data status
    console.log('\n🌏 Geographic Data:');
    try {
      const cities = await pool.query('SELECT COUNT(*) as count FROM cities');
      const barangays = await pool.query('SELECT COUNT(*) as count FROM barangays');
      console.log(`  • Cities: ${cities.rows[0].count} (Visayas & Mindanao)`);
      console.log(`  • Barangays: ${barangays.rows[0].count} total`);
    } catch (error) {
      console.log(`  • ❌ Geographic data ERROR: ${error.message}`);
    }
    
    // Show item descriptions status
    console.log('\n💎 Item Descriptions:');
    try {
      const descriptions = await pool.query(`
        SELECT c.name, COUNT(d.id) as count 
        FROM categories c 
        LEFT JOIN descriptions d ON c.id = d.category_id 
        GROUP BY c.name 
        ORDER BY c.name
      `);
      
      let totalDesc = 0;
      descriptions.rows.forEach(cat => {
        console.log(`  • ${cat.name}: ${cat.count} descriptions`);
        totalDesc += parseInt(cat.count);
      });
      console.log(`  • Total: ${totalDesc} selectable descriptions`);
    } catch (error) {
      console.log(`  • ❌ Descriptions ERROR: ${error.message}`);
    }
    
    // Show system configuration status
    console.log('\n⚙️  System Configuration:');
    try {
      const configs = await pool.query(`
        SELECT config_key, config_value 
        FROM system_config 
        WHERE config_key IN ('company_name', 'default_interest_rate', 'max_loan_amount') 
        ORDER BY config_key
      `);
      
      configs.rows.forEach(config => {
        console.log(`  • ${config.config_key}: ${config.config_value}`);
      });
    } catch (error) {
      console.log(`  • ❌ Configuration ERROR: ${error.message}`);
    }
    
    await pool.end();
    
    console.log('\n🎉 Database verification complete!');
    console.log('✅ Your pawn shop system is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  showAllCreatedTables();
}

module.exports = showAllCreatedTables;