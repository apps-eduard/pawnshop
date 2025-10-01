const { pool } = require('./config/database');

async function checkPendingData() {
    try {
        console.log('\n=== Checking all appraisal data ===');
        const allResult = await pool.query(`
            SELECT a.id, a.status, a.pawner_id, a.description, a.estimated_value, 
                   p.first_name, p.last_name
            FROM appraisals a 
            LEFT JOIN pawners p ON a.pawner_id = p.id 
            ORDER BY a.id
        `);
        console.table(allResult.rows);

        console.log('\n=== Checking pending appraisals only ===');
        const pendingResult = await pool.query(`
            SELECT a.id, a.status, a.pawner_id, a.description, a.estimated_value, 
                   p.first_name, p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) as full_name
            FROM appraisals a 
            LEFT JOIN pawners p ON a.pawner_id = p.id 
            WHERE a.status = 'pending'
            ORDER BY a.id
        `);
        console.table(pendingResult.rows);

        console.log('\n=== Checking pawners table ===');
        const pawnersResult = await pool.query('SELECT * FROM pawners ORDER BY id');
        console.table(pawnersResult.rows);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkPendingData();