/**
 * Script to create pawnshop_db database
 */

const { Client } = require('pg');

async function createDatabase() {
  // Connect to default postgres database first
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default postgres db
    password: '123',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'pawnshop_db'"
    );

    if (checkDb.rows.length > 0) {
      console.log('ℹ️  Database "pawnshop_db" already exists');
    } else {
      // Create database
      await client.query('CREATE DATABASE pawnshop_db');
      console.log('🎉 Database "pawnshop_db" created successfully!');
    }

    console.log('\n✅ You can now run: npm run setup-db\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Tip: Update the password in this script (line 12) to match your PostgreSQL password');
    }
  } finally {
    await client.end();
  }
}

createDatabase();
