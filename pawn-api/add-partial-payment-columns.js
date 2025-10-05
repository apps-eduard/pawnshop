const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: process.env.DB_PASSWORD || '123'
});

async function addPartialPaymentColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting to add partial payment columns to pawn_tickets table...');
    
    await client.query('BEGIN');
    
    // Check if columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pawn_tickets' 
        AND column_name IN (
          'partial_payment', 
          'new_principal_loan', 
          'discount_amount', 
          'advance_interest', 
          'net_payment', 
          'payment_amount'
        )
    `);
    
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    console.log('📋 Existing columns:', existingColumns);
    
    // Add missing columns
    const columnsToAdd = [
      { name: 'partial_payment', type: 'DECIMAL(10, 2)', default: '0' },
      { name: 'new_principal_loan', type: 'DECIMAL(10, 2)', default: 'NULL' },
      { name: 'discount_amount', type: 'DECIMAL(10, 2)', default: '0' },
      { name: 'advance_interest', type: 'DECIMAL(10, 2)', default: '0' },
      { name: 'net_payment', type: 'DECIMAL(10, 2)', default: '0' },
      { name: 'payment_amount', type: 'DECIMAL(10, 2)', default: '0' }
    ];
    
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`➕ Adding column: ${col.name}`);
        await client.query(`
          ALTER TABLE pawn_tickets 
          ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}
        `);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`⏭️  Column already exists: ${col.name}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Successfully added all partial payment columns!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding columns:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addPartialPaymentColumns()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
