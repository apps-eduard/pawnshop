const { pool } = require('../config/database');

async function checkCurrentSchema() {
  try {
    console.log('📋 Current TRANSACTIONS table schema:');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    
    result.rows.forEach(col => {
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(Optional)' : '(Required)'}`);
    });
    
    console.log('\n📋 Current PAWN_ITEMS table schema:');
    const itemsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items'
      ORDER BY ordinal_position
    `);
    
    itemsResult.rows.forEach(col => {
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(Optional)' : '(Required)'}`);
    });
    
    console.log('\n📋 Current CATEGORIES table schema:');
    const categoriesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    categoriesResult.rows.forEach(col => {
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(Optional)' : '(Required)'}`);
    });
    
    console.log('\n📋 Current DESCRIPTIONS table schema:');
    const descriptionsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'descriptions'
      ORDER BY ordinal_position
    `);
    
    descriptionsResult.rows.forEach(col => {
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(Optional)' : '(Required)'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkCurrentSchema();