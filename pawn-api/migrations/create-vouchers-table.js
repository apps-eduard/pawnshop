const { pool } = require('../config/database');

async function createVouchersTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting migration: Create vouchers table...\n');
    
    // Check if table already exists
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'vouchers'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ Table vouchers already exists');
      return;
    }
    
    // Create vouchers table (removed foreign key constraint since users table may not exist)
    await client.query(`
      CREATE TABLE vouchers (
        id SERIAL PRIMARY KEY,
        voucher_type VARCHAR(10) NOT NULL CHECK (voucher_type IN ('cash', 'cheque')),
        voucher_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
        notes TEXT NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT voucher_amount_positive CHECK (amount > 0)
      )
    `);
    
    console.log('✅ Created vouchers table');
    
    // Add indexes for better query performance
    await client.query(`
      CREATE INDEX idx_vouchers_date ON vouchers(voucher_date DESC)
    `);
    console.log('✅ Created index on voucher_date');
    
    await client.query(`
      CREATE INDEX idx_vouchers_created_by ON vouchers(created_by)
    `);
    console.log('✅ Created index on created_by');
    
    await client.query(`
      CREATE INDEX idx_vouchers_type ON vouchers(voucher_type)
    `);
    console.log('✅ Created index on voucher_type');
    
    await client.query(`
      CREATE INDEX idx_vouchers_created_at ON vouchers(created_at DESC)
    `);
    console.log('✅ Created index on created_at');
    
    // Add comments to columns
    await client.query(`
      COMMENT ON TABLE vouchers IS 'Stores cash and cheque vouchers created by managers';
      COMMENT ON COLUMN vouchers.id IS 'Primary key';
      COMMENT ON COLUMN vouchers.voucher_type IS 'Type of voucher: cash or cheque';
      COMMENT ON COLUMN vouchers.voucher_date IS 'Date of the voucher transaction';
      COMMENT ON COLUMN vouchers.amount IS 'Voucher amount in pesos';
      COMMENT ON COLUMN vouchers.notes IS 'Description or notes about the voucher';
      COMMENT ON COLUMN vouchers.created_by IS 'User ID of the person who created the voucher';
      COMMENT ON COLUMN vouchers.created_at IS 'Timestamp when voucher was created';
      COMMENT ON COLUMN vouchers.updated_at IS 'Timestamp when voucher was last updated';
    `);
    console.log('✅ Added column comments');
    
    // Create trigger to automatically update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_vouchers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created update timestamp function');
    
    await client.query(`
      CREATE TRIGGER trigger_update_vouchers_updated_at
      BEFORE UPDATE ON vouchers
      FOR EACH ROW
      EXECUTE FUNCTION update_vouchers_updated_at();
    `);
    console.log('✅ Created update timestamp trigger');
    
    console.log('\n✨ Migration completed successfully!\n');
    console.log('📊 Vouchers table structure:');
    console.log('   - id (SERIAL PRIMARY KEY)');
    console.log('   - voucher_type (VARCHAR(10): cash/cheque)');
    console.log('   - voucher_date (DATE)');
    console.log('   - amount (DECIMAL(15,2))');
    console.log('   - notes (TEXT)');
    console.log('   - created_by (INTEGER → users.id)');
    console.log('   - created_at (TIMESTAMP)');
    console.log('   - updated_at (TIMESTAMP)\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createVouchersTable()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { createVouchersTable };
