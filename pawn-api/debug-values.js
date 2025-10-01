const { pool } = require('./config/database');

async function debugValues() {
    try {
        const result = await pool.query(`
            SELECT a.id, a.estimated_value, p.first_name, p.last_name
            FROM appraisals a 
            LEFT JOIN pawners p ON a.pawner_id = p.id 
            WHERE a.status = 'pending'
        `);
        
        console.log('Raw data from database:');
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`  estimated_value: "${row.estimated_value}"`);
            console.log(`  Type: ${typeof row.estimated_value}`);
            console.log(`  ParseFloat: ${parseFloat(row.estimated_value)}`);
            console.log(`  IsNaN: ${isNaN(parseFloat(row.estimated_value))}`);
            console.log(`  String length: ${String(row.estimated_value).length}`);
            console.log(`  Raw value: [${JSON.stringify(row.estimated_value)}]`);
            console.log('  ---');
        });
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

debugValues();