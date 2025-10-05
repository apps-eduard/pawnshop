const { pool } = require('./config/database');

async function checkPawnItemsStructure() {
  try {
    console.log('🔍 Checking pawn_items table structure...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
      ORDER BY ordinal_position
    `);
    
    console.log('pawn_items table columns:');
    console.log('=' .repeat(40));
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Check sample data
    const sampleData = await pool.query('SELECT COUNT(*) as count FROM pawn_items');
    console.log(`\nRecords in pawn_items: ${sampleData.rows[0].count}`);
    
    // Check a sample record if exists
    const sample = await pool.query('SELECT * FROM pawn_items LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\nSample record columns:');
      Object.keys(sample.rows[0]).forEach(key => {
        console.log(`- ${key}: ${sample.rows[0][key]}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPawnItemsStructure();