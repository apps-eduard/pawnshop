const bcrypt = require('bcrypt');
const { pool } = require('./config/database');

async function updateCashierPassword() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hashedPassword, 'cashier1']);
        console.log('✅ Password updated for cashier1 to "admin123"');
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

updateCashierPassword();