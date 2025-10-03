const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'pawnshop_db',
    password: process.env.DB_PASSWORD || '123',
    port: process.env.DB_PORT || 5432,
};

async function runSystemConfigMigration() {
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('Connected to database');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'add_system_config.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Running system_config migration...');
        await client.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        
        // Verify the table was created
        const result = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'system_config'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 System Config table structure:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
        // Check default configuration
        const configResult = await client.query(`
            SELECT config_key, config_value, description 
            FROM system_config 
            ORDER BY config_key
        `);
        
        console.log('\n⚙️ Default configurations:');
        configResult.rows.forEach(row => {
            console.log(`  - ${row.config_key}: ${row.description}`);
        });
        
        // Check branches table for code column
        const branchResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'branches' AND column_name = 'code'
        `);
        
        if (branchResult.rows.length > 0) {
            console.log('\n🏢 Branch code column added successfully');
            
            // Show existing branches with codes
            const existingBranches = await client.query(`
                SELECT id, name, code, address 
                FROM branches 
                ORDER BY id
            `);
            
            if (existingBranches.rows.length > 0) {
                console.log('\n📍 Existing branches with codes:');
                existingBranches.rows.forEach(branch => {
                    console.log(`  - ${branch.name} (${branch.code}): ${branch.address || 'No address'}`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) {
            console.error('Details:', error.detail);
        }
    } finally {
        await client.end();
        console.log('\nDatabase connection closed');
    }
}

// Run the migration
if (require.main === module) {
    runSystemConfigMigration()
        .then(() => {
            console.log('\n🎉 System configuration migration completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runSystemConfigMigration };