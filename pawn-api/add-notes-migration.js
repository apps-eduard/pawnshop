const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '123',
  database: 'pawnshop_db',
  port: 5432
});

async function addNotesToCategories() {
  try {
    const sql = fs.readFileSync('migrations/add_notes_to_categories.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Notes field added to categories');
    
    const result = await pool.query('SELECT * FROM categories');
    console.log('📊 Updated Categories:');
    result.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.interest_rate} interest`);
      console.log(`  Notes: ${row.notes || 'No notes'}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addNotesToCategories();