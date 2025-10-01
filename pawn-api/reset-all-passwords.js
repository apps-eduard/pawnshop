const bcrypt = require('bcrypt');
const { pool } = require('./config/database');

async function resetUserPasswords() {
    try {
        console.log('🔍 Checking current users...');
        const users = await pool.query('SELECT id, username, role FROM users ORDER BY id');
        console.table(users.rows);

        console.log('\n🔑 Resetting passwords...');
        
        // Set all user passwords to a consistent pattern
        const updates = [
            { username: 'admin', password: 'admin123' },
            { username: 'manager1', password: 'manager123' },
            { username: 'cashier1', password: 'cashier123' },
            { username: 'auctioneer1', password: 'auctioneer123' },
            { username: 'appraiser1', password: 'appraiser123' }
        ];

        for (const update of updates) {
            const hashedPassword = await bcrypt.hash(update.password, 10);
            const result = await pool.query(
                'UPDATE users SET password_hash = $1 WHERE username = $2',
                [hashedPassword, update.username]
            );
            
            if (result.rowCount > 0) {
                console.log(`✅ Updated ${update.username} password to: ${update.password}`);
            } else {
                console.log(`❌ User ${update.username} not found`);
            }
        }

        // Check if we need to create a pawner user (if it's supposed to be a user, not just data in pawners table)
        console.log('\n🔍 Checking if pawner user should exist...');
        const pawnerCheck = await pool.query("SELECT id FROM users WHERE username LIKE '%pawner%'");
        if (pawnerCheck.rows.length === 0) {
            console.log('ℹ️  No pawner user found - pawners are stored in the pawners table, not users table');
            console.log('ℹ️  Pawners don\'t login - they are managed by staff users');
        }

        await pool.end();
        console.log('\n✅ Password reset complete!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

resetUserPasswords();