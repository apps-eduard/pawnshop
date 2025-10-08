/**
 * Migration: Add tracking_number column to transactions table
 * 
 * Purpose: Implement tracking number chain architecture
 * - Each transaction gets its own unique ticket number
 * - All related transactions share the same tracking_number
 * - tracking_number = the original new loan ticket number
 * 
 * Example:
 * New Loan:        ticket=TXN-100, tracking_number=TXN-100
 * Additional Loan: ticket=TXN-101, tracking_number=TXN-100
 * Partial Pay:     ticket=TXN-102, tracking_number=TXN-100
 * Renew:           ticket=TXN-103, tracking_number=TXN-100
 * Redeem:          ticket=TXN-104, tracking_number=TXN-100
 * 
 * Query history: SELECT * FROM transactions WHERE tracking_number = 'TXN-100'
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pawnshop_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function up() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting migration: Add tracking_number column...');
    
    await client.query('BEGIN');
    
    // 1. Add tracking_number column (nullable for now)
    console.log('📝 Step 1: Adding tracking_number column...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(50)
    `);
    
    // 2. For existing transactions, set tracking_number based on relationship
    console.log('📝 Step 2: Populating tracking_number for existing transactions...');
    
    // For parent transactions (parent_transaction_id IS NULL), use their own transaction_number
    await client.query(`
      UPDATE transactions 
      SET tracking_number = transaction_number 
      WHERE parent_transaction_id IS NULL 
        AND tracking_number IS NULL
    `);
    
    // For child transactions, use parent's transaction_number as tracking_number
    await client.query(`
      UPDATE transactions t1
      SET tracking_number = (
        SELECT t2.transaction_number 
        FROM transactions t2 
        WHERE t2.id = t1.parent_transaction_id
      )
      WHERE t1.parent_transaction_id IS NOT NULL 
        AND t1.tracking_number IS NULL
    `);
    
    // 3. Add index for faster queries
    console.log('📝 Step 3: Adding index on tracking_number...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_tracking_number 
      ON transactions(tracking_number)
    `);
    
    // 4. Add previous_transaction_number column for chain tracking (optional but useful)
    console.log('📝 Step 4: Adding previous_transaction_number column...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS previous_transaction_number VARCHAR(50)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_previous_transaction 
      ON transactions(previous_transaction_number)
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('- Added tracking_number column');
    console.log('- Populated tracking_number for existing transactions');
    console.log('- Added index for tracking_number');
    console.log('- Added previous_transaction_number for chain tracking');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Rolling back migration: Remove tracking_number column...');
    
    await client.query('BEGIN');
    
    await client.query(`
      DROP INDEX IF EXISTS idx_transactions_tracking_number
    `);
    
    await client.query(`
      DROP INDEX IF EXISTS idx_transactions_previous_transaction
    `);
    
    await client.query(`
      ALTER TABLE transactions 
      DROP COLUMN IF EXISTS tracking_number
    `);
    
    await client.query(`
      ALTER TABLE transactions 
      DROP COLUMN IF EXISTS previous_transaction_number
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Rollback completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'up') {
    up()
      .then(() => {
        console.log('Migration completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  } else if (command === 'down') {
    down()
      .then(() => {
        console.log('Rollback completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node add-tracking-number-column.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
