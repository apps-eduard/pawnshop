const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function moveGrantedDateToTransactions() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔧 Moving granted_date from pawn_tickets to transactions table...\n');
    
    await client.query('BEGIN');
    
    // Step 1: Add granted_date column to transactions table
    console.log('📋 Step 1: Adding granted_date column to transactions table...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS granted_date TIMESTAMP
    `);
    console.log('✅ Column added to transactions table\n');
    
    // Step 2: Copy granted_date from pawn_tickets to transactions
    console.log('📋 Step 2: Copying granted_date from pawn_tickets to transactions...');
    const updateResult = await client.query(`
      UPDATE transactions t
      SET granted_date = pt.granted_date
      FROM pawn_tickets pt
      WHERE t.id = pt.transaction_id
        AND pt.granted_date IS NOT NULL
        AND t.granted_date IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} transactions with granted_date\n`);
    
    // Step 3: For new_loan transactions without granted_date, set it to transaction_date
    console.log('📋 Step 3: Setting granted_date = transaction_date for new_loan transactions...');
    const newLoanResult = await client.query(`
      UPDATE transactions
      SET granted_date = transaction_date
      WHERE transaction_type = 'new_loan'
        AND granted_date IS NULL
    `);
    console.log(`✅ Updated ${newLoanResult.rowCount} new_loan transactions\n`);
    
    // Step 4: Drop granted_date column from pawn_tickets
    console.log('📋 Step 4: Dropping granted_date column from pawn_tickets...');
    await client.query(`
      ALTER TABLE pawn_tickets 
      DROP COLUMN IF EXISTS granted_date
    `);
    console.log('✅ Column dropped from pawn_tickets\n');
    
    await client.query('COMMIT');
    
    // Verification
    console.log('📋 Step 5: Verifying the migration...');
    const verifyTransactions = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE granted_date IS NOT NULL) as with_granted_date,
        COUNT(*) FILTER (WHERE granted_date IS NULL) as without_granted_date,
        COUNT(*) as total
      FROM transactions
      WHERE transaction_type = 'new_loan'
    `);
    
    const stats = verifyTransactions.rows[0];
    console.log(`  ✅ Transactions with granted_date: ${stats.with_granted_date}`);
    console.log(`  ⚠️  Transactions without granted_date: ${stats.without_granted_date}`);
    console.log(`  📊 Total new_loan transactions: ${stats.total}`);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

moveGrantedDateToTransactions()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
