const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setGrantedDateForTickets() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔧 Setting granted_date for pawn tickets...\n');
    
    // Update granted_date in pawn_tickets using the transaction_date of the parent new_loan transaction
    console.log('📋 Step 1: Setting granted_date for pawn tickets from new_loan transactions...');
    const result = await client.query(`
      UPDATE pawn_tickets pt
      SET granted_date = t.transaction_date
      FROM transactions t
      WHERE pt.transaction_id = t.id
        AND t.transaction_type = 'new_loan'
        AND pt.granted_date IS NULL
      RETURNING pt.ticket_number, pt.granted_date
    `);
    
    console.log(`✅ Updated ${result.rowCount} pawn tickets with granted_date\n`);
    
    if (result.rowCount > 0) {
      console.log('📊 Sample updated tickets:');
      result.rows.slice(0, 5).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.ticket_number} -> ${new Date(row.granted_date).toLocaleDateString()}`);
      });
    }
    
    // Verify the update
    console.log('\n📋 Step 2: Verifying pawn tickets with granted_date...');
    const verify = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE granted_date IS NOT NULL) as tickets_with_granted_date,
        COUNT(*) FILTER (WHERE granted_date IS NULL) as tickets_without_granted_date,
        COUNT(*) as total_tickets
      FROM pawn_tickets pt
      JOIN transactions t ON pt.transaction_id = t.id
      WHERE t.transaction_type = 'new_loan'
    `);
    
    const stats = verify.rows[0];
    console.log(`  ✅ Tickets with granted_date: ${stats.tickets_with_granted_date}`);
    console.log(`  ⚠️  Tickets without granted_date: ${stats.tickets_without_granted_date}`);
    console.log(`  📊 Total new_loan tickets: ${stats.total_tickets}`);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

setGrantedDateForTickets()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
