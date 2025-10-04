const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function simplifyItemAppraisalsTable() {
  try {
    console.log('=== SIMPLIFYING ITEM_APPRAISALS TABLE ===');
    
    // Drop the existing table and recreate with simplified structure
    await pool.query('DROP TABLE IF EXISTS item_appraisals CASCADE');
    console.log('✅ Dropped existing item_appraisals table');
    
    // Create simplified table with only category, description, notes
    await pool.query(`
      CREATE TABLE item_appraisals (
        id SERIAL PRIMARY KEY,
        pawner_id INTEGER NOT NULL REFERENCES pawners(id),
        appraiser_id INTEGER REFERENCES employees(id),
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        notes TEXT,
        estimated_value DECIMAL(15,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Created simplified item_appraisals table');
    
    // Check new structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'item_appraisals'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== SIMPLIFIED TABLE STRUCTURE ===');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n✅ Item details now simplified to: category, description, notes');
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

simplifyItemAppraisalsTable();