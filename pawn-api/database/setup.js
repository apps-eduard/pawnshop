const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  try {
    // Test database connection first
    console.log('🔗 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log(`✅ Connected to database: ${testResult.rows[0].db_version.split(' ')[0]}`);
    
    // Read and execute schema
    console.log('📋 Creating database schema and tables...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📄 Schema file loaded (${schemaSql.length} characters)`);
    
    // Execute the entire schema as one query to handle dollar-quoted strings properly
    console.log('🔨 Executing schema (dropping existing tables, creating new ones)...');
    await pool.query(schemaSql);
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('✅ Database schema created successfully');
    console.log('📋 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   📄 ${row.table_name}`);
    });
    
    // Run seeding
    console.log('🌱 Seeding database with initial data...');
    const { seedDatabase } = require('./seed');
    await seedDatabase();
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Ensure PostgreSQL is running');
    console.error('   2. Check database credentials in .env file');
    console.error('   3. Verify database user has CREATE privileges');
    console.error('   4. Check if database exists and is accessible');
    throw error;
  } finally {
    await pool.end();
  }
}

module.exports = { setupDatabase };

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🏁 Database setup process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup process failed:', error);
      process.exit(1);
    });
}