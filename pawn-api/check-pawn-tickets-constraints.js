// Check pawn_tickets table constraints and valid statuses
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkConstraints() {
    try {
        console.log('🔍 Checking pawn_tickets table constraints...');
        
        // Check constraints
        const constraintsResult = await pool.query(`
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE table_name = 'pawn_tickets'
        `);
        
        console.log('Check constraints found:');
        constraintsResult.rows.forEach(row => {
            console.log(`  ${row.constraint_name}: ${row.check_clause}`);
        });
        
        // Check table structure
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'pawn_tickets'
            ORDER BY ordinal_position
        `);
        
        console.log('\nTable structure:');
        structureResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
        });
        
        // Check what status values currently exist
        const statusResult = await pool.query(`
            SELECT DISTINCT status 
            FROM pawn_tickets 
            WHERE status IS NOT NULL
        `);
        
        console.log('\nExisting status values:');
        statusResult.rows.forEach(row => {
            console.log(`  "${row.status}"`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkConstraints();