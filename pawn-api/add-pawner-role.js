const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function addPawnerRole() {
  console.log('🔄 Starting pawner role addition...');
  
  try {
    console.log('🔄 Dropping existing role constraint...');
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
    
    console.log('🔄 Adding new role constraint with pawner...');
    await pool.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('administrator', 'manager', 'cashier', 'auctioneer', 'appraiser', 'pawner'));");
    
    console.log('🔄 Creating password hash...');
    const passwordHash = await bcrypt.hash('pawner123', 10);
    
    console.log('🔄 Inserting test pawner user...');
    await pool.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, branch_id, position, contact_number, address) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, ['pawner1', 'pawner@pawnshop.com', passwordHash, 'Maria', 'Santos', 'pawner', 1, 'Customer', '+1-555-2001', '1001 Customer St, City Center']);
    
    console.log('✅ Pawner role added to database constraint');
    console.log('✅ Test pawner user created: pawner1 / pawner123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Full error:', error);
  } finally {
    await pool.end();
    console.log('🔄 Database connection closed');
  }
}

addPawnerRole();