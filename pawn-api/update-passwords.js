const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function updatePasswords() {
  try {
    console.log('🔐 Updating passwords for appraiser and auctioneer...');
    
    // Hash the passwords
    const appraiserPassword = await bcrypt.hash('appraiser123', 10);
    const auctioneerPassword = await bcrypt.hash('auctioneer123', 10);
    
    // Update appraiser password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [appraiserPassword, 'appraiser1']
    );
    console.log('✅ Updated appraiser1 password');
    
    // Update auctioneer password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [auctioneerPassword, 'auctioneer1']
    );
    console.log('✅ Updated auctioneer1 password');
    
    console.log('🎉 Password update completed!');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await pool.end();
  }
}

updatePasswords();