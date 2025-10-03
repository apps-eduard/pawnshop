const { pool } = require('./config/database');

async function testFreshInstall() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing fresh install scenario...');
    
    // Check current state
    const employeeCount = await client.query('SELECT COUNT(*) FROM employees');
    const pawnerCount = await client.query('SELECT COUNT(*) FROM pawners');
    const cityCount = await client.query('SELECT COUNT(*) FROM cities');
    const barangayCount = await client.query('SELECT COUNT(*) FROM barangays');
    
    console.log('\n📊 Current Database State:');
    console.log(`   Employees: ${employeeCount.rows[0].count}`);
    console.log(`   Pawners: ${pawnerCount.rows[0].count}`);
    console.log(`   Cities: ${cityCount.rows[0].count}`);
    console.log(`   Barangays: ${barangayCount.rows[0].count}`);
    
    // Check if we have the required tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'pawners', 'cities', 'barangays', 'branches')
      ORDER BY table_name
    `);
    
    console.log('\n🗃️  Available Tables:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check if we have any sample users
    if (parseInt(employeeCount.rows[0].count) > 0) {
      console.log('\n👥 Sample Users Found:');
      const users = await client.query(`
        SELECT user_id, username, role, first_name, last_name, position 
        FROM employees 
        WHERE is_active = true 
        ORDER BY user_id
      `);
      
      users.rows.forEach(user => {
        const emoji = user.username === 'admin' ? '⚡' :
                     user.role === 'manager' ? '👔' :
                     user.role === 'cashier' ? '💰' :
                     user.role === 'auctioneer' ? '🔨' :
                     user.role === 'appraiser' ? '💎' :
                     user.role === 'pawner' ? '👤' : '👤';
        console.log(`   ${emoji} ${user.username} (${user.role}) - ${user.first_name} ${user.last_name}`);
      });
      
      console.log('\n🔐 Ready for Login!');
      console.log('   You can use these credentials to login to the system.');
    } else {
      console.log('\n⚠️  No users found - you need to run the seeding script.');
      console.log('   Run: node add-sample-data.js');
    }
    
  } catch (error) {
    console.error('❌ Error testing fresh install:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testFreshInstall();
    process.exit(0);
  } catch (error) {
    console.error('Failed to test fresh install:', error);
    process.exit(1);
  }
}

main();