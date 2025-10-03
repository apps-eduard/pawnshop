const { pool } = require('./config/database');

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
      ORDER BY ordinal_position;
    `);
    console.log('📊 pawn_items table structure:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkTable();