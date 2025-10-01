const { pool } = require('./config/database');

async function testPendingEndpoint() {
    try {
        console.log('\n=== Testing Pending Appraisals Ready Endpoint ===');
        
        // Direct test of the query
        const result = await pool.query(`
            SELECT a.id, a.pawner_id, a.item_category, a.item_type, a.description, a.estimated_value,
                   a.status, a.created_at,
                   p.first_name, p.last_name
            FROM appraisals a
            JOIN pawners p ON a.pawner_id = p.id
            WHERE a.status = 'pending'
            AND a.id NOT IN (
                SELECT DISTINCT appraisal_id 
                FROM transactions 
                WHERE appraisal_id IS NOT NULL
            )
            ORDER BY a.created_at DESC
        `);
        
        console.log(`Found ${result.rows.length} pending appraisals:`);
        
        const mappedData = result.rows.map(row => {
            const pawnerName = `${row.first_name} ${row.last_name}`;
            const itemType = row.item_type || row.description;
            const totalValue = parseFloat(row.estimated_value);
            
            console.log(`Processing appraisal ${row.id}:`);
            console.log(`   Pawner: "${pawnerName}"`);
            console.log(`   Item Type: "${itemType}"`);
            console.log(`   Value: ₱${totalValue}`);
            
            return {
                id: row.id,
                pawnerName: pawnerName,
                itemType: itemType,
                totalAppraisedValue: totalValue,
                pawnerId: row.pawner_id,
                category: row.item_category,
                status: row.status,
                createdAt: row.created_at
            };
        });
        
        console.log('\n=== Final mapped data ===');
        console.table(mappedData);
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

testPendingEndpoint();