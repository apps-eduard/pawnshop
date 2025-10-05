const { pool } = require('./config/database');

async function checkUsers() {
  try {
    const result = await pool.query('SELECT username, role FROM employees WHERE is_active = true LIMIT 5');
    console.log('Available users:');
    result.rows.forEach(row => console.log(`- ${row.username} (${row.role})`));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();