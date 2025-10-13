const { pool } = require('../config/database');

async function checkNumericFields() {
    try {
        console.log('=== CHECKING NUMERIC FIELD CONSTRAINTS ===');
        
        const result = await pool.query(`
            SELECT column_name, data_type, numeric_precision, numeric_scale, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND data_type = 'numeric'
            ORDER BY ordinal_position
        `);
        
        console.log('Numeric fields in transactions table:');
        result.rows.forEach(col => {
            console.log(`  ${col.column_name}: NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`);
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkNumericFields();