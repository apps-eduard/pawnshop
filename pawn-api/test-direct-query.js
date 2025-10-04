const { pool } = require('./config/database');

async function testDirectQuery() {
    try {
        console.log('=== TESTING DIRECT DATABASE QUERY ===');
        
        const result = await pool.query(`
            SELECT ia.id, ia.pawner_id, ia.appraiser_id, ia.category, ia.description,
                   ia.notes, ia.estimated_value, ia.status, ia.created_at,
                   p.first_name, p.last_name, p.mobile_number as contact_number,
                   e.first_name as appraiser_first_name, e.last_name as appraiser_last_name
            FROM item_appraisals ia
            JOIN pawners p ON ia.pawner_id = p.id
            LEFT JOIN employees e ON ia.appraiser_id = e.id
            WHERE ia.status = $1
            ORDER BY ia.created_at DESC
        `, ['completed']);
        
        console.log('✅ Query successful! Found', result.rows.length, 'completed appraisals');
        
        if (result.rows.length > 0) {
            console.log('Sample record:', {
                id: result.rows[0].id,
                pawner_name: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
                category: result.rows[0].category,
                status: result.rows[0].status
            });
        }
        
        await pool.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

testDirectQuery();