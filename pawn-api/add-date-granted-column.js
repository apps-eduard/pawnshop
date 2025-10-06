/**
 * Add date_granted column to transactions table
 * This column stores the original date when the loan was granted (during new_loan)
 * and is copied to all child transactions (redeem, renew, additional, partial)
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

async function addDateGrantedColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding date_granted column to transactions table...\n');

    // Add the column
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS date_granted TIMESTAMP
    `);
    console.log('✅ Added date_granted column');

    // Update existing new_loan transactions to set date_granted = transaction_date
    const updateNewLoans = await client.query(`
      UPDATE transactions 
      SET date_granted = transaction_date 
      WHERE transaction_type = 'new_loan' AND date_granted IS NULL
    `);
    console.log(`✅ Updated ${updateNewLoans.rowCount} new_loan transactions with date_granted`);

    // Update child transactions (with parent_transaction_id) to copy date_granted from parent
    const updateChildren = await client.query(`
      UPDATE transactions AS child
      SET date_granted = parent.date_granted
      FROM transactions AS parent
      WHERE child.parent_transaction_id = parent.id 
        AND child.date_granted IS NULL
        AND parent.date_granted IS NOT NULL
    `);
    console.log(`✅ Updated ${updateChildren.rowCount} child transactions with date_granted from parent`);

    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
        AND column_name = 'date_granted'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('\n✅ Column added successfully:');
      console.log(`   - ${verifyResult.rows[0].column_name}: ${verifyResult.rows[0].data_type}`);
    }

    // Show sample data
    const sampleData = await client.query(`
      SELECT 
        transaction_number,
        transaction_type,
        transaction_date::date,
        date_granted::date,
        parent_transaction_id
      FROM transactions 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('\n📋 Sample transactions:');
    sampleData.rows.forEach(row => {
      console.log(`   ${row.transaction_number} (${row.transaction_type})`);
      console.log(`      Transaction Date: ${row.transaction_date}`);
      console.log(`      Date Granted: ${row.date_granted || 'NULL'}`);
      console.log(`      Parent ID: ${row.parent_transaction_id || 'NULL'}`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addDateGrantedColumn()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
