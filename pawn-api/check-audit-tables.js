const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pawnshop_db',
    password: '123',
    port: 5432,
});

async function checkAuditTables() {
    try {
        console.log('Checking for audit-related tables...');
        
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_name LIKE '%audit%'
            ORDER BY table_name;
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ No audit tables found');
        } else {
            console.log('✅ Found audit tables:');
            for (const row of result.rows) {
                console.log(`  - ${row.table_name}`);
                
                // Get columns for each audit table
                const columns = await pool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position;
                `, [row.table_name]);
                
                console.log(`    Columns for ${row.table_name}:`);
                columns.rows.forEach(col => {
                    console.log(`      ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
                });
                console.log('');
            }
        }
        
    } catch (error) {
        console.error('Error checking audit tables:', error);
    } finally {
        await pool.end();
    }
}

checkAuditTables();