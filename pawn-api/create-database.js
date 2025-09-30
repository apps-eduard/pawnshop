const { Pool } = require('pg');

async function createDatabase() {
  // Connect to PostgreSQL server (not to specific database)
  const adminPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default postgres database
    password: process.env.DB_PASSWORD || '123',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🔗 Connecting to PostgreSQL server...');
    
    // Check if database exists
    const checkDb = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'pawnshop_db'"
    );
    
    if (checkDb.rows.length > 0) {
      console.log('✅ Database "pawnshop_db" already exists');
    } else {
      console.log('🗄️ Creating database "pawnshop_db"...');
      await adminPool.query('CREATE DATABASE pawnshop_db');
      console.log('✅ Database "pawnshop_db" created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL Connection Tips:');
      console.log('1. Make sure PostgreSQL is installed and running');
      console.log('2. Check if PostgreSQL service is started');
      console.log('3. Verify connection settings in config/database.js');
      console.log('4. Default connection: localhost:5432, user: postgres, password: 123');
    }
    
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  createDatabase()
    .then(() => {
      console.log('🏁 Database creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createDatabase };