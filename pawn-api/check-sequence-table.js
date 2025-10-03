const { pool } = require('./config/database');

async function checkSequenceTable() {
  try {
    console.log('🔍 Checking transaction_sequences table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_sequences'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creating transaction_sequences table...');
      await pool.query(`
        CREATE TABLE transaction_sequences (
          year INTEGER PRIMARY KEY,
          next_number INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Insert current year
      const currentYear = new Date().getFullYear();
      await pool.query(`
        INSERT INTO transaction_sequences (year, next_number) 
        VALUES ($1, 1) 
        ON CONFLICT (year) DO NOTHING
      `, [currentYear]);
      
      console.log('✅ transaction_sequences table created with current year');
    } else {
      console.log('✅ transaction_sequences table already exists');
    }
    
    // Show current sequences
    const sequences = await pool.query('SELECT * FROM transaction_sequences ORDER BY year DESC');
    console.log('📊 Current sequences:', sequences.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkSequenceTable();