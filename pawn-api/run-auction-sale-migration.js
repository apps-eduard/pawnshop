const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: add-auction-sale-fields.sql');
    console.log('='.repeat(50));
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'migrations', 'add-auction-sale-fields.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Added columns to pawn_items:');
    console.log('  - buyer_name');
    console.log('  - buyer_contact');
    console.log('  - sale_notes');
    console.log('  - discount_amount');
    console.log('  - final_price');
    console.log('  - received_amount');
    console.log('  - change_amount');
    console.log('');
    console.log('Indexes created:');
    console.log('  - idx_pawn_items_buyer_name');
    console.log('  - idx_pawn_items_sold_date');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
