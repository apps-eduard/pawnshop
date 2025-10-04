const { pool } = require('./config/database');

async function testSchemaFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing database schema...');
    
    // Test if all required tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'cities', 'barangays', 'pawners', 'branches')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available Tables:');
    const existingTables = tables.rows.map(row => row.table_name);
    const requiredTables = ['employees', 'cities', 'barangays', 'pawners', 'branches'];
    
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - MISSING`);
      }
    });
    
    // Test the health check query that was failing
    try {
      const cityCount = await client.query('SELECT COUNT(*) as count FROM cities');
      console.log(`\n✅ Cities table accessible: ${cityCount.rows[0].count} cities found`);
    } catch (error) {
      console.log(`\n❌ Cities table error: ${error.message}`);
    }
    
    // Test employees table
    try {
      const employeeCount = await client.query('SELECT COUNT(*) as count FROM employees');
      console.log(`✅ Employees table accessible: ${employeeCount.rows[0].count} employees found`);
    } catch (error) {
      console.log(`❌ Employees table error: ${error.message}`);
    }
    
    console.log('\n🎯 Schema test completed!');
    
  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testSchemaFix();
    process.exit(0);
  } catch (error) {
    console.error('Failed to test schema:', error);
    process.exit(1);
  }
}

main();