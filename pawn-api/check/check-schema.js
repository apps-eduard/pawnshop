const { pool } = require('../config/database');

async function checkSchema() {
  try {
    console.log('Checking descriptions table schema...');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'descriptions'
      ORDER BY ordinal_position
    `);
    console.log('Descriptions table columns:', result.rows);
    
    if (result.rows.length > 0) {
      const sample = await pool.query('SELECT * FROM descriptions LIMIT 1');
      console.log('Sample description row:', sample.rows[0]);
    }
    
    // Also check pawn_items columns
    const itemsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items'
      ORDER BY ordinal_position
    `);
    console.log('\nPawn_items table columns:', itemsResult.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkSchema();