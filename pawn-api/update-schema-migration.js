const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function updateSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database schema update...');
    
    const alterQueries = [
      // Date fields
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS loan_date DATE DEFAULT CURRENT_DATE',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS expiry_date DATE',
      
      // Payment and balance fields  
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS balance_remaining DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0',
      
      // Additional transaction fields
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS additional_amount DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS renewal_fee DECIMAL(12,2) DEFAULT 0', 
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(12,2) DEFAULT 0',
      
      // Completion tracking dates
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS redeemed_date DATE',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS renewed_date DATE',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS defaulted_date DATE',
      
      // User and transaction tracking
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT \'new_loan\'',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS parent_ticket_id INTEGER',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS approved_by INTEGER',
      
      // Metadata
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS reason TEXT',
      'ALTER TABLE pawn_tickets ADD COLUMN IF NOT EXISTS notes TEXT'
    ];
    
    let successCount = 0;
    for (const query of alterQueries) {
      try {
        await client.query(query);
        const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Added column:', columnName);
        successCount++;
      } catch (err) {
        if (err.message.includes('already exists')) {
          const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1]; 
          console.log('⚠️ Column exists:', columnName);
        } else {
          console.log('❌ Error:', err.message);
        }
      }
    }
    
    // Add foreign key constraint after column creation
    try {
      await client.query('ALTER TABLE pawn_tickets ADD CONSTRAINT fk_parent_ticket FOREIGN KEY (parent_ticket_id) REFERENCES pawn_tickets(id)');
      console.log('✅ Added foreign key constraint for parent_ticket_id');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️ Foreign key constraint already exists');
      }
    }
    
    console.log(`🎉 Schema update completed! Added ${successCount} new columns.`);
    
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
  } finally {
    client.release(); 
    await pool.end();
  }
}

updateSchema();