const { pool } = require('../config/database');

async function checkTransactionsTable() {
    try {
        console.log('=== CHECKING TRANSACTIONS TABLE STRUCTURE ===');
        
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'transactions'
            ORDER BY ordinal_position
        `);
        
        console.log('transactions table structure:');
        structure.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkTransactionsTable();