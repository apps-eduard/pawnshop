const { pool } = require('./config/database');

async function testCategoryDescriptionAPI() {
  try {
    console.log('Testing category description creation...\n');
    
    // First, let's check if we have any categories
    const categories = await pool.query('SELECT id, name FROM categories LIMIT 5');
    console.log('Available categories:');
    categories.rows.forEach(cat => console.log(` - ID: ${cat.id}, Name: ${cat.name}`));
    
    if (categories.rows.length === 0) {
      console.log('\nNo categories found! Creating a test category...');
      const newCat = await pool.query(`
        INSERT INTO categories (name, description, interest_rate, is_active)
        VALUES ('Test Category', 'Test Description', 5.0, true)
        RETURNING *
      `);
      console.log('Created category:', newCat.rows[0]);
    }
    
    // Check descriptions table structure
    console.log('\nChecking descriptions table structure...');
    const descStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'descriptions'
      ORDER BY ordinal_position;
    `);
    
    console.log('descriptions table columns:');
    descStructure.rows.forEach(col => {
      console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Test inserting a description
    const categoryId = categories.rows[0]?.id || 1;
    const testDescription = 'Test Item Description for API';
    
    console.log(`\nTesting description insertion for category ID: ${categoryId}`);
    
    const result = await pool.query(`
      INSERT INTO descriptions (category_id, name, notes, is_active)
      VALUES ($1, $2::varchar, $3::text, true)
      RETURNING *
    `, [categoryId, testDescription, testDescription]);
    
    console.log('✅ Description created successfully:', result.rows[0]);
    
    // Check existing descriptions for this category
    const existing = await pool.query(`
      SELECT * FROM descriptions WHERE category_id = $1 ORDER BY created_at DESC LIMIT 5
    `, [categoryId]);
    
    console.log(`\nExisting descriptions for category ${categoryId}:`);
    existing.rows.forEach(desc => {
      console.log(` - ID: ${desc.id}, Name: ${desc.name}, Active: ${desc.is_active}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing category description API:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint
    });
    process.exit(1);
  }
}

testCategoryDescriptionAPI();