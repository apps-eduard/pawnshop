/**
 * Migrate date_granted from transactions table to pawn_tickets table as granted_date
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrateGrantedDate() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Migrating date_granted from transactions to pawn_tickets...\n');

    await client.query('BEGIN');

    // 1. Add granted_date column to pawn_tickets
    console.log('📋 Step 1: Adding granted_date column to pawn_tickets...');
    await client.query(`
      ALTER TABLE pawn_tickets 
      ADD COLUMN IF NOT EXISTS granted_date TIMESTAMP
    `);
    console.log('✅ Column added to pawn_tickets\n');

    // 2. Copy date_granted from transactions to pawn_tickets
    console.log('📋 Step 2: Copying date_granted data to pawn_tickets...');
    const updateResult = await client.query(`
      UPDATE pawn_tickets pt
      SET granted_date = t.date_granted
      FROM transactions t
      WHERE pt.transaction_id = t.id
        AND t.date_granted IS NOT NULL
        AND pt.granted_date IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} pawn_tickets records\n`);

    // 3. Drop date_granted column from transactions
    console.log('📋 Step 3: Removing date_granted column from transactions...');
    await client.query(`
      ALTER TABLE transactions 
      DROP COLUMN IF EXISTS date_granted
    `);
    console.log('✅ Column removed from transactions\n');

    await client.query('COMMIT');

    // 4. Verify the migration
    console.log('🔍 Verifying migration...\n');
    
    const ticketsWithGrantedDate = await client.query(`
      SELECT COUNT(*) as count
      FROM pawn_tickets
      WHERE granted_date IS NOT NULL
    `);
    
    console.log(`✅ Pawn tickets with granted_date: ${ticketsWithGrantedDate.rows[0].count}`);

    // Check if date_granted still exists in transactions (should be 0)
    const transactionsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
        AND column_name = 'date_granted'
    `);
    
    if (transactionsCheck.rows.length === 0) {
      console.log('✅ date_granted successfully removed from transactions table');
    } else {
      console.log('⚠️  Warning: date_granted still exists in transactions table');
    }

    // Check if granted_date exists in pawn_tickets
    const ticketsCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'pawn_tickets' 
        AND column_name = 'granted_date'
    `);
    
    if (ticketsCheck.rows.length > 0) {
      console.log(`✅ granted_date successfully added to pawn_tickets table (${ticketsCheck.rows[0].data_type})`);
    }

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateGrantedDate()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
