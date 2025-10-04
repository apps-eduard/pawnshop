const { pool } = require('./config/database');

async function testDatabaseConnection() {
    try {
        console.log('=== TESTING DATABASE CONNECTION ===');
        
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        console.log('Current time from DB:', result.rows[0].now);
        
        await pool.end();
        console.log('✅ Database connection closed gracefully');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testDatabaseConnection();