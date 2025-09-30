const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '123',
  database: 'pawnshop_db',
  port: 5432
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('migrations/create_category_descriptions_table.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Category descriptions table created');
    
    const result = await pool.query(`
      SELECT cd.*, c.name as category_name 
      FROM category_descriptions cd 
      JOIN categories c ON cd.category_id = c.id 
      ORDER BY c.name, cd.description
    `);
    
    console.log('📊 Category Descriptions:');
    result.rows.forEach(row => {
      console.log(`  ${row.category_name}: ${row.description}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();