const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db', 
  user: 'postgres',
  password: '123'
});

async function checkData() {
  try {
    const cities = await pool.query('SELECT id, name FROM cities ORDER BY name LIMIT 10');
    console.log('Cities:', cities.rows);
    
    const barangays = await pool.query('SELECT id, name, city_id FROM barangays ORDER BY name LIMIT 10');
    console.log('Barangays:', barangays.rows);
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkData();