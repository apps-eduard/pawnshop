const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function updatePasswords() {
  try {
    console.log('🔐 Updating passwords for all test users...');
    
    // Define all test users and their passwords
    const users = [
      { username: 'admin', password: 'admin123' },
      { username: 'manager1', password: 'manager123' },
      { username: 'cashier1', password: 'cashier123' },
      { username: 'auctioneer1', password: 'auctioneer123' },
      { username: 'appraiser1', password: 'appraiser123' },
      { username: 'pawner1', password: 'pawner123' }
    ];
    
    // Update each user's password
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Update the user's password in the database
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [passwordHash, user.username]
      );
      console.log(`✅ Updated ${user.username} password to "${user.password}"`);
    }
    
    console.log('🎉 All passwords have been updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await pool.end();
  }
}

updatePasswords();