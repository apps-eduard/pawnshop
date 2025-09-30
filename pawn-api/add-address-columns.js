const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addAddressColumns() {
  console.log('📄 Connected to PostgreSQL database');
  console.log('🔧 Adding address columns to pawners table...');

  try {
    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      AND column_name IN ('city_id', 'barangay_id', 'address_details');
    `);

    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    if (existingColumns.length === 0) {
      // Add the missing columns
      await pool.query(`
        ALTER TABLE pawners 
        ADD COLUMN city_id INTEGER REFERENCES cities(id),
        ADD COLUMN barangay_id INTEGER REFERENCES barangays(id),
        ADD COLUMN address_details TEXT;
      `);
      
      console.log('✅ Added city_id, barangay_id, and address_details columns to pawners table');
      
      // Migrate existing address data to address_details
      await pool.query(`
        UPDATE pawners 
        SET address_details = address 
        WHERE address IS NOT NULL AND address_details IS NULL;
      `);
      
      console.log('✅ Migrated existing address data to address_details column');
      
    } else {
      console.log(`ℹ️  Address columns already exist: ${existingColumns.join(', ')}`);
    }

    // Also check if employees table has the address columns
    const checkEmployeesColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('city_id', 'barangay_id');
    `);

    if (checkEmployeesColumns.rows.length === 0) {
      // Create employees table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id),
          position VARCHAR(100),
          contact_number VARCHAR(20),
          city_id INTEGER REFERENCES cities(id),
          barangay_id INTEGER REFERENCES barangays(id),
          address TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Created employees table with address columns');
    } else {
      console.log('ℹ️  Employees table already has address columns');
    }

    console.log('🎉 Database schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating database schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addAddressColumns().catch(console.error);