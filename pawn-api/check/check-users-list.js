// Check available users in database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: 'admin123',
  port: 5432
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT username, role FROM employees LIMIT 5');
    console.log('Available users:');
    result.rows.forEach(user => {
      console.log(`- Username: ${user.username}, Role: ${user.role}`);
    });
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkUsers();