const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  try {
    // Read and execute schema
    console.log('📋 Creating database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one query to handle dollar-quoted strings properly
    await pool.query(schemaSql);
    
    console.log('✅ Database schema created successfully');
    
    // Run seeding
    console.log('🌱 Seeding database with initial data...');
    const { seedDatabase } = require('./seed');
    await seedDatabase();
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
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