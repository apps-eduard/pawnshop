// Check pawners table structure
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkPawnersTable() {
    try {
        console.log('🔍 Checking pawners table structure...');
        
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pawners'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Pawners table columns:');
        result.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type}`);
        });
        
        // Check for contact-related columns specifically
        console.log('\n📞 Contact-related columns:');
        const contactCols = result.rows.filter(col => 
            col.column_name.includes('contact') || 
            col.column_name.includes('mobile') || 
            col.column_name.includes('phone')
        );
        contactCols.forEach(col => {
            console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPawnersTable();