const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db', 
  user: 'postgres',
  password: '123'
});

async function addInterestRateColumn() {
  try {
    console.log('Adding interest_rate column to appraisals table...');
    
    await pool.query(`
      ALTER TABLE appraisals 
      ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,4) DEFAULT 0.05
    `);
    
    console.log('✅ Successfully added interest_rate column');
    
    // Also add the category and category_description columns for the new system
    await pool.query(`
      ALTER TABLE appraisals 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS category_description TEXT
    `);
    
    console.log('✅ Successfully added category columns');
    
    // Update existing records to have category based on item_category
    await pool.query(`
      UPDATE appraisals 
      SET category = item_category,
          category_description = item_category_description
      WHERE category IS NULL
    `);
    
    console.log('✅ Updated existing records with category data');
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

addInterestRateColumn();