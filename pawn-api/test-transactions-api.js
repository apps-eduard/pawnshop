// Test transactions API endpoint to debug the 500 error
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testTransactionsQuery() {
    try {
        console.log('🔍 Testing transactions query...');
        
        // Test the exact query from the transactions route
        const result = await pool.query(`
            SELECT t.*, 
                   p.first_name, p.last_name, p.mobile_number, p.email,
                   p.city_id, p.barangay_id, p.house_number, p.street,
                   c.name as city_name, b.name as barangay_name,
                   e.first_name as cashier_first_name, e.last_name as cashier_last_name,
                   br.name as branch_name
            FROM transactions t
            JOIN pawners p ON t.pawner_id = p.id
            LEFT JOIN cities c ON p.city_id = c.id
            LEFT JOIN barangays b ON p.barangay_id = b.id
            LEFT JOIN branches br ON t.branch_id = br.id
            LEFT JOIN employees e ON t.created_by = e.id
            ORDER BY t.created_at DESC
            LIMIT 5
        `);
        
        console.log(`✅ Query successful! Found ${result.rows.length} transactions`);
        
        if (result.rows.length > 0) {
            console.log('\n📋 Sample transaction data:');
            const row = result.rows[0];
            console.log('ID:', row.id);
            console.log('Transaction Number:', row.transaction_number);
            console.log('Pawner:', `${row.first_name} ${row.last_name}`);
            console.log('Principal Amount:', row.principal_amount);
            console.log('Interest Rate:', row.interest_rate);
            console.log('Status:', row.status);
            console.log('Created At:', row.created_at);
            
            // Test the response mapping
            console.log('\n🔄 Testing response mapping...');
            const mapped = {
                id: row.id,
                transaction_number: row.transaction_number,
                customer_name: `${row.first_name} ${row.last_name}`,
                pawner_name: `${row.first_name} ${row.last_name}`,
                amount: parseFloat(row.principal_amount || 0),
                principal_amount: parseFloat(row.principal_amount || 0),
                status: row.status === 'active' ? 'completed' : row.status,
                created_at: new Date(row.created_at),
                loan_date: new Date(row.loan_date || row.created_at),
                maturity_date: new Date(row.maturity_date),
                expiry_date: new Date(row.expiry_date)
            };
            
            console.log('✅ Response mapping successful:', mapped);
        }
        
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        console.error('Error details:', error);
        
        // Check if tables exist
        try {
            console.log('\n🔍 Checking if tables exist...');
            const tables = ['transactions', 'pawners', 'employees', 'cities', 'barangays', 'branches'];
            
            for (const table of tables) {
                const result = await pool.query(`
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_name = $1
                `, [table]);
                
                const exists = parseInt(result.rows[0].count) > 0;
                console.log(`  ${table}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
                
                if (exists && table === 'transactions') {
                    const dataResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                    console.log(`    Records: ${dataResult.rows[0].count}`);
                }
            }
        } catch (tableError) {
            console.error('❌ Error checking tables:', tableError.message);
        }
    } finally {
        await pool.end();
    }
}

testTransactionsQuery();