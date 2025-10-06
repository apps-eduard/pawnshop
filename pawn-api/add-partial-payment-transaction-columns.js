/**
 * Add Partial Payment Columns to Transactions Table
 * 
 * This script adds columns to the transactions table to store partial payment details
 * including discount, advance interest, advance service charge, net payment, and new principal loan.
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

async function addPartialPaymentColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting to add partial payment columns to transactions table...\n');

    // Check which columns already exist
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
        AND column_name IN (
          'discount_amount',
          'advance_interest', 
          'advance_service_charge',
          'net_payment',
          'new_principal_loan'
        )
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    console.log('📋 Existing columns:', existingColumns.length > 0 ? existingColumns : 'None');

    // Define columns to add
    const columnsToAdd = [
      { name: 'discount_amount', type: 'DECIMAL(10, 2)', default: '0', description: 'Discount applied to partial payment' },
      { name: 'advance_interest', type: 'DECIMAL(10, 2)', default: '0', description: 'Advance interest for partial payment' },
      { name: 'advance_service_charge', type: 'DECIMAL(10, 2)', default: '0', description: 'Advance service charge for partial payment' },
      { name: 'net_payment', type: 'DECIMAL(10, 2)', default: '0', description: 'Net payment amount (actual payment to loan)' },
      { name: 'new_principal_loan', type: 'DECIMAL(10, 2)', default: 'NULL', description: 'New principal loan amount after partial payment' }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    // Add each column if it doesn't exist
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        try {
          const alterQuery = `
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}
          `;
          
          await client.query(alterQuery);
          console.log(`✅ Added column: ${col.name} (${col.type}) - ${col.description}`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Error adding column ${col.name}:`, error.message);
        }
      } else {
        console.log(`⏭️  Skipped: ${col.name} (already exists)`);
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} columns`);
    console.log(`   ⏭️  Skipped: ${skippedCount} columns (already exist)`);

    // Verify the columns were added
    console.log('\n🔍 Verifying columns...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
        AND column_name IN (
          'discount_amount',
          'advance_interest', 
          'advance_service_charge',
          'net_payment',
          'new_principal_loan'
        )
      ORDER BY column_name
    `);

    console.log('\n✅ Current partial payment columns in transactions table:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'})`);
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
addPartialPaymentColumns()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
