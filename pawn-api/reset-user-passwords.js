const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetUserPasswords() {
  console.log('🔐 Resetting User Passwords to Demo Account Passwords...');
  console.log('═'.repeat(60));
  
  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: 'Administrator' },
    { username: 'manager1', password: 'manager123', role: 'Manager' },
    { username: 'cashier1', password: 'cashier123', role: 'Cashier' },
    { username: 'auctioneer1', password: 'auctioneer123', role: 'Auctioneer' },
    { username: 'appraiser1', password: 'appraiser123', role: 'Appraiser' },
    { username: 'pawner1', password: 'pawner123', role: 'Pawner' }
  ];

  try {
    // Check database connection
    console.log('🔌 Connecting to database...');
    const testConnection = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Check what users exist
    console.log('\n📋 Checking existing users...');
    const existingUsers = await pool.query('SELECT username, role FROM employees ORDER BY username');
    
    if (existingUsers.rows.length === 0) {
      console.log('❌ No users found in database!');
      console.log('💡 Please run setup.bat first to create the users.');
      return;
    }
    
    console.log(`Found ${existingUsers.rows.length} users:`);
    existingUsers.rows.forEach(user => {
      console.log(`  • ${user.username} (${user.role})`);
    });
    
    console.log('\n🔄 Updating passwords...');
    let successCount = 0;
    let notFoundCount = 0;
    
    for (const account of demoAccounts) {
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(account.password, 10);
        
        // Update the user's password
        const updateResult = await pool.query(
          'UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE username = $2',
          [hashedPassword, account.username]
        );
        
        if (updateResult.rowCount > 0) {
          console.log(`✅ ${account.username.padEnd(12)} → ${account.password.padEnd(15)} (${account.role})`);
          successCount++;
        } else {
          console.log(`⚠️  ${account.username.padEnd(12)} → User not found in database`);
          notFoundCount++;
        }
      } catch (error) {
        console.log(`❌ ${account.username.padEnd(12)} → Error: ${error.message}`);
      }
    }
    
    // Verify one password to make sure it works
    console.log('\n🧪 Testing password verification...');
    const testUser = await pool.query('SELECT password_hash FROM employees WHERE username = $1', ['admin']);
    if (testUser.rows.length > 0) {
      const isValid = await bcrypt.compare('admin123', testUser.rows[0].password_hash);
      console.log(`Admin password test: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 Password Reset Complete!');
    console.log(`✅ Successfully updated: ${successCount} users`);
    if (notFoundCount > 0) {
      console.log(`⚠️  Users not found: ${notFoundCount}`);
    }
    
    console.log('\n📝 Updated Login Credentials:');
    console.log('┌──────────────┬──────────────┬──────────────┐');
    console.log('│ Username     │ Password     │ Role         │');
    console.log('├──────────────┼──────────────┼──────────────┤');
    demoAccounts.forEach(account => {
      console.log(`│ ${account.username.padEnd(12)} │ ${account.password.padEnd(12)} │ ${account.role.padEnd(12)} │`);
    });
    console.log('└──────────────┴──────────────┴──────────────┘');
    
    console.log('\n💡 You can now login with any of the above credentials!');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('  • Make sure PostgreSQL is running');
    console.log('  • Check your .env file for correct database credentials');
    console.log('  • Run setup.bat first if users don\'t exist');
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the password reset
resetUserPasswords().catch(console.error);