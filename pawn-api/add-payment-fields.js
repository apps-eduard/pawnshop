const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function addPaymentFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding essential payment calculation fields...');
    
    await client.query('BEGIN');
    
    // Essential fields for REDEEM calculations (no change/received - display only)
    console.log('\n📋 ADDING REDEEM FIELDS:');
    
    const redeemFields = [
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS redeem_amount DECIMAL(12,2) DEFAULT 0'
    ];
    
    for (const query of redeemFields) {
      try {
        await client.query(query);
        const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Added field:', columnName);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
          console.log('⚠️ Field exists:', columnName);
        } else {
          console.log('❌ Error:', err.message);
        }
      }
    }
    
    // Essential fields for PARTIAL PAYMENT calculations (no change/received - display only)
    console.log('\n📋 ADDING PARTIAL PAYMENT FIELDS:');
    
    const partialFields = [
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS partial_payment DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS new_principal_loan DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS advance_interest DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS net_payment DECIMAL(12,2) DEFAULT 0'
    ];
    
    console.log('💡 Note: advance_service_charge uses existing service_charge field');
    
    for (const query of partialFields) {
      try {
        await client.query(query);
        const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Added field:', columnName);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
          console.log('⚠️ Field exists:', columnName);
        } else {
          console.log('❌ Error:', err.message);
        }
      }
    }
    
    // Note: discount_amount is already added above for redeem, will be reused for partial payments
    
    // Add indexes for performance
    console.log('\n📋 ADDING PERFORMANCE INDEXES:');
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_pawn_tickets_redeem_amount ON pawn_tickets(redeem_amount)',
      'CREATE INDEX IF NOT EXISTS idx_pawn_tickets_partial_payment ON pawn_tickets(partial_payment)',
      'CREATE INDEX IF NOT EXISTS idx_pawn_tickets_status_type ON pawn_tickets(status, transaction_type)'
    ];
    
    for (const query of indexQueries) {
      try {
        await client.query(query);
        const indexName = query.split('CREATE INDEX IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Created index:', indexName);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const indexName = query.split('CREATE INDEX IF NOT EXISTS')[1]?.split(' ')[1];
          console.log('⚠️ Index exists:', indexName);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 Payment calculation fields added successfully!');
    
    // Verify the additions
    console.log('\n🔍 VERIFYING PAYMENT FIELDS:');
    
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pawn_tickets' 
      AND column_name IN (
        'discount_amount', 'redeem_amount', 'partial_payment', 
        'new_principal_loan', 'advance_interest', 'net_payment',
        'service_charge'
      )
      ORDER BY column_name
    `);
    
    console.log('📋 Payment calculation fields in pawn_tickets:');
    verifyResult.rows.forEach(row => {
      console.log('  ✅', row.column_name, '(' + row.data_type + ')', 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL',
                  row.column_default ? 'default: ' + row.column_default : '');
    });
    
    console.log('\n💡 Note: change_amount and amount_received are display-only fields for cashier guidance');
    console.log('💡 These will be calculated in real-time on the frontend without database storage.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding payment fields:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addPaymentFields();