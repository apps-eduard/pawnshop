const { pool } = require('../config/database');

async function checkTransactionTables() {
  try {
    console.log('🔍 Checking transaction-related tables...\n');
    
    // Check what tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%pawn%'
        OR table_name LIKE '%transaction%'
      ORDER BY table_name
    `);
    
    console.log('Transaction/Pawn related tables:');
    console.log('=' .repeat(40));
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check pawn_tickets table structure if it exists
    const pawnTicketsCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'pawn_tickets' 
      ORDER BY ordinal_position
    `);
    
    if (pawnTicketsCheck.rows.length > 0) {
      console.log('\npawn_tickets table columns:');
      console.log('=' .repeat(40));
      pawnTicketsCheck.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
      
      // Check sample data
      const sampleData = await pool.query('SELECT COUNT(*) as count FROM pawn_tickets');
      console.log(`\nRecords in pawn_tickets: ${sampleData.rows[0].count}`);
    } else {
      console.log('\n❌ pawn_tickets table does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTransactionTables();