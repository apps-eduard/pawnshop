const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pawnshop_db',
    password: 'admin',
    port: 5432,
});

async function checkAuditLogsTable() {
    try {
        console.log('Checking audit_logs table structure...');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs' 
            ORDER BY ordinal_position;
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ audit_logs table does not exist');
        } else {
            console.log('✅ audit_logs table structure:');
            result.rows.forEach(row => {
                console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
            });
        }
        
        // Also check if table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'audit_logs'
            );
        `);
        
        console.log(`\nTable exists: ${tableExists.rows[0].exists}`);
        
    } catch (error) {
        console.error('Error checking audit_logs table:', error);
    } finally {
        await pool.end();
    }
}

checkAuditLogsTable();