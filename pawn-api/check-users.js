const { pool } = require('./config/database');

async function checkUsers() {
  try {
    const result = await pool.query('SELECT username, role, email FROM users ORDER BY username');
    console.log('Users in database:');
    result.rows.forEach(user => {
      console.log(`${user.username} (${user.role}) - ${user.email}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();