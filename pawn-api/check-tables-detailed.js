const { pool } = require('./config/database');

async function checkTables() {
    try {
        console.log('=== CHECKING DATABASE TABLES ===');
        
        // Check if old appraisals table still exists
        const checkOldTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'appraisals'
            )
        `);
        console.log('Old appraisals table exists:', checkOldTable.rows[0].exists);
        
        // Check if new item_appraisals table exists
        const checkNewTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'item_appraisals'
            )
        `);
        console.log('New item_appraisals table exists:', checkNewTable.rows[0].exists);
        
        // If new table exists, check its structure
        if (checkNewTable.rows[0].exists) {
            const structure = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'item_appraisals'
                ORDER BY ordinal_position
            `);
            console.log('\nitem_appraisals table structure:');
            structure.rows.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type}`);
            });
            
            // Check data count
            const count = await pool.query('SELECT COUNT(*) FROM item_appraisals');
            console.log(`\nRecords in item_appraisals: ${count.rows[0].count}`);
        }
        
        await pool.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
}

checkTables();