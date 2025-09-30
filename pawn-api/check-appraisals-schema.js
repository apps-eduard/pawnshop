const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db', 
  user: 'postgres',
  password: '123'
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appraisals' 
      ORDER BY ordinal_position
    `);
    
    console.log('Appraisals table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkSchema();