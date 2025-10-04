const { pool } = require('./config/database');

async function checkPawnTicketsTable() {
    try {
        console.log('=== CHECKING PAWN_TICKETS TABLE STRUCTURE ===');
        
        // Check if table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pawn_tickets'
            )
        `);
        console.log('pawn_tickets table exists:', tableExists.rows[0].exists);
        
        if (tableExists.rows[0].exists) {
            // Check table structure
            const structure = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default 
                FROM information_schema.columns 
                WHERE table_name = 'pawn_tickets'
                ORDER BY ordinal_position
            `);
            
            console.log('\npawn_tickets table structure:');
            structure.rows.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
            
            // Check if pawner_id column exists
            const pawnerIdExists = structure.rows.some(col => col.column_name === 'pawner_id');
            console.log(`\npawner_id column exists: ${pawnerIdExists}`);
            
            // Show similar columns
            const similarCols = structure.rows.filter(col => 
                col.column_name.includes('pawner') || 
                col.column_name.includes('customer') || 
                col.column_name.includes('client')
            );
            
            if (similarCols.length > 0) {
                console.log('\nSimilar columns found:');
                similarCols.forEach(col => {
                    console.log(`  ${col.column_name}: ${col.data_type}`);
                });
            }
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkPawnTicketsTable();