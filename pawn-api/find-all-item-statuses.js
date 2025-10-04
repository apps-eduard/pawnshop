// Find all item status values used in the system
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function findAllItemStatuses() {
    try {
        console.log('🔍 Finding all item status values in the system...');
        console.log('=' .repeat(60));
        
        // 1. Check pawn_items table constraint
        console.log('\n1️⃣  Checking pawn_items status constraint:');
        try {
            const constraintQuery = await pool.query(`
                SELECT conname, consrc 
                FROM pg_constraint 
                WHERE conrelid = 'pawn_items'::regclass 
                AND contype = 'c'
                AND conname LIKE '%status%'
            `);
            
            if (constraintQuery.rows.length > 0) {
                constraintQuery.rows.forEach(row => {
                    console.log(`   Constraint: ${row.conname}`);
                    console.log(`   Rule: ${row.consrc}`);
                });
            } else {
                console.log('   No status constraints found in pawn_items');
            }
        } catch (err) {
            console.log('   Could not check constraints:', err.message);
        }
        
        // 2. Get actual status values from database
        console.log('\n2️⃣  Current status values in pawn_items table:');
        try {
            const statusQuery = await pool.query(`
                SELECT DISTINCT status, COUNT(*) as count
                FROM pawn_items 
                WHERE status IS NOT NULL
                GROUP BY status
                ORDER BY count DESC
            `);
            
            if (statusQuery.rows.length > 0) {
                statusQuery.rows.forEach(row => {
                    console.log(`   "${row.status}" (${row.count} items)`);
                });
            } else {
                console.log('   No status values found in database');
            }
        } catch (err) {
            console.log('   Could not check existing statuses:', err.message);
        }
        
        // 3. Check table structure
        console.log('\n3️⃣  pawn_items table structure:');
        try {
            const structureQuery = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'pawn_items'
                AND column_name = 'status'
            `);
            
            if (structureQuery.rows.length > 0) {
                const col = structureQuery.rows[0];
                console.log(`   ${col.column_name}: ${col.data_type}`);
                console.log(`   Nullable: ${col.is_nullable}`);
                console.log(`   Default: ${col.column_default || 'none'}`);
            }
        } catch (err) {
            console.log('   Could not check table structure:', err.message);
        }
        
        console.log('\n4️⃣  Common pawn item statuses in pawnshop systems:');
        console.log('   📋 Typical statuses should be:');
        console.log('   • "active" - Item is pledged/pawned');
        console.log('   • "redeemed" - Item was bought back by customer');
        console.log('   • "sold" - Item was sold at auction');
        console.log('   • "expired" - Loan expired, item available for sale');
        console.log('   • "lost" - Item was lost or damaged');
        console.log('   • "returned" - Item returned to customer');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

findAllItemStatuses();