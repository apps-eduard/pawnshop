const { pool } = require('./config/database');

async function checkUsersTable() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        console.log('Users table structure:');
        console.table(result.rows);
        
        // Also get sample data
        const sampleData = await pool.query('SELECT * FROM users LIMIT 2');
        console.log('\nSample user data:');
        console.table(sampleData.rows);
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkUsersTable();