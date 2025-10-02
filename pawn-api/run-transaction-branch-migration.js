const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function runTransactionBranchMigration() {
  try {
    console.log('🔄 Running transaction branch tracking migration...');
    const sql = fs.readFileSync('./migrations/transaction_branch_tracking.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Transaction branch tracking migration completed successfully');
    
    // Verify the columns were added
    const appraisalsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'appraisals' AND column_name = 'branch_id'
    `);
    
    const transactionsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'branch_id'
    `);
    
    console.log('\n📋 Verification:');
    console.log(`- Appraisals branch_id column: ${appraisalsCheck.rows.length > 0 ? '✅ Added' : '❌ Missing'}`);
    console.log(`- Transactions branch_id column: ${transactionsCheck.rows.length > 0 ? '✅ Added' : '❌ Missing'}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runTransactionBranchMigration();