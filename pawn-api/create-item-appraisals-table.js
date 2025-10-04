const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function createItemAppraisalsTable() {
  try {
    console.log('=== CREATING ITEM_APPRAISALS TABLE ===');
    
    // Create the table that matches frontend expectations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_appraisals (
        id SERIAL PRIMARY KEY,
        pawner_id INTEGER NOT NULL REFERENCES pawners(id),
        appraiser_id INTEGER REFERENCES employees(id),
        category VARCHAR(100) NOT NULL,
        category_description VARCHAR(255),
        item_type VARCHAR(100),
        description TEXT NOT NULL,
        serial_number VARCHAR(100),
        weight DECIMAL(10,2),
        karat VARCHAR(10),
        estimated_value DECIMAL(15,2) NOT NULL,
        condition_notes TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ item_appraisals table created successfully');
    
    // Check if table was created
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'item_appraisals'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTable structure:');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

createItemAppraisalsTable();