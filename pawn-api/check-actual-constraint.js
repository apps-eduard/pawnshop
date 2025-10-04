// Check the actual pawn_items constraint definition
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkActualConstraint() {
    try {
        console.log('🔍 Checking actual pawn_items constraint definition...');
        
        // Method 1: Check constraint from pg_constraint (PostgreSQL 12+)
        try {
            const constraintQuery = await pool.query(`
                SELECT 
                    conname,
                    pg_get_constraintdef(oid) as constraint_def
                FROM pg_constraint 
                WHERE conrelid = 'pawn_items'::regclass 
                AND contype = 'c'
                AND conname LIKE '%status%'
            `);
            
            console.log('✅ Found constraint definition:');
            constraintQuery.rows.forEach(row => {
                console.log(`   Name: ${row.conname}`);
                console.log(`   Definition: ${row.constraint_def}`);
            });
            
        } catch (err) {
            console.log('❌ Method 1 failed:', err.message);
        }

        // Method 2: Check information_schema
        try {
            const infoQuery = await pool.query(`
                SELECT 
                    constraint_name,
                    check_clause
                FROM information_schema.check_constraints 
                WHERE constraint_name LIKE '%pawn_items%status%'
            `);
            
            if (infoQuery.rows.length > 0) {
                console.log('\n✅ Information schema results:');
                infoQuery.rows.forEach(row => {
                    console.log(`   ${row.constraint_name}: ${row.check_clause}`);
                });
            }
        } catch (err) {
            console.log('❌ Method 2 failed:', err.message);
        }
        
        // Method 3: Try to insert a test row to see what's allowed
        console.log('\n🧪 Testing what status values are actually allowed...');
        
        const testStatuses = ['active', 'in_vault', 'pledged', 'redeemed', 'sold', 'expired'];
        
        for (const status of testStatuses) {
            try {
                await pool.query('BEGIN');
                await pool.query(`
                    INSERT INTO pawn_items (
                        transaction_id, category_id, custom_description, 
                        appraised_value, loan_amount, status
                    ) VALUES (99999, 1, 'TEST', 100, 100, $1)
                `, [status]);
                await pool.query('ROLLBACK'); // Don't actually insert
                console.log(`   ✅ "${status}" - ALLOWED`);
            } catch (err) {
                await pool.query('ROLLBACK');
                console.log(`   ❌ "${status}" - REJECTED: ${err.message.split('\n')[0]}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkActualConstraint();