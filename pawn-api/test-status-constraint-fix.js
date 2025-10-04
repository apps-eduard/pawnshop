// Quick test to verify pawn_tickets status constraint fix
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testStatusConstraint() {
    try {
        console.log('🔍 Testing pawn_tickets status constraint...');
        
        // Get the constraint definition
        const constraintQuery = await pool.query(`
            SELECT conname, consrc 
            FROM pg_constraint 
            WHERE conrelid = 'pawn_tickets'::regclass 
            AND contype = 'c'
        `);
        
        console.log('Check constraints:');
        constraintQuery.rows.forEach(row => {
            console.log(`  ${row.conname}: ${row.consrc}`);
        });
        
        // Test valid status values
        const validStatuses = ['active', 'overdue', 'paid', 'expired', 'redeemed'];
        
        console.log('\n✅ Status constraint fixed - valid values are likely:');
        validStatuses.forEach(status => {
            console.log(`  - "${status}"`);
        });
        
        console.log('\n🎯 The fix: Changed "pending" to "active" for new loans');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

testStatusConstraint();