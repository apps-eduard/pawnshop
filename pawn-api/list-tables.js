const { pool } = require('./config/database');

async function listTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`📊 Database Tables (${result.rows.length} total):\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${row.table_name}`);
    });
    
    console.log('\n✅ Tables listed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

listTables();