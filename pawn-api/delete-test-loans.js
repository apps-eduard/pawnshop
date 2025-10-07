/**
 * Script to delete existing test loans before re-seeding
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function deleteTestLoans() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Deleting existing test loans...\n');

    await client.query('BEGIN');

    // Step 1: Delete pawn_items (links transactions to items/appraisals)
    const deleteItems = await client.query(`
      DELETE FROM pawn_items 
      WHERE transaction_id IN (
        SELECT id FROM transactions WHERE transaction_number LIKE 'TEST-%'
      )
      RETURNING id
    `);

    if (deleteItems.rows.length > 0) {
      console.log(`✅ Deleted ${deleteItems.rows.length} pawn items`);
    }

    // Step 2: Delete test pawn tickets
    const deleteTickets = await client.query(`
      DELETE FROM pawn_tickets 
      WHERE ticket_number LIKE 'TEST-%'
      RETURNING id, ticket_number
    `);

    if (deleteTickets.rows.length > 0) {
      console.log(`✅ Deleted ${deleteTickets.rows.length} test pawn tickets:`);
      deleteTickets.rows.forEach(row => {
        console.log(`   - ${row.ticket_number} (ID: ${row.id})`);
      });
    } else {
      console.log('   No test pawn tickets found to delete.');
    }

    // Step 3: Delete test transactions
    const deleteResult = await client.query(`
      DELETE FROM transactions 
      WHERE transaction_number LIKE 'TEST-%'
      RETURNING id, transaction_number
    `);

    if (deleteResult.rows.length > 0) {
      console.log(`\n✅ Deleted ${deleteResult.rows.length} test transactions:`);
      deleteResult.rows.forEach(row => {
        console.log(`   - ${row.transaction_number} (ID: ${row.id})`);
      });
    } else {
      console.log('   No test transactions found to delete.');
    }

    // Step 4: Delete test appraisals (from TEST RECENT pawner)
    const deleteAppraisals = await client.query(`
      DELETE FROM item_appraisals 
      WHERE pawner_id IN (
        SELECT id FROM pawners WHERE first_name = 'TEST' AND last_name = 'RECENT'
      ) AND status = 'completed'
      RETURNING id
    `);

    if (deleteAppraisals.rows.length > 0) {
      console.log(`\n✅ Deleted ${deleteAppraisals.rows.length} test appraisals`);
    }

    await client.query('COMMIT');

    console.log('\n🎉 Test loan cleanup completed successfully!\n');
    console.log('You can now run: node seed-test-loan-recent-dates.js\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting test loans:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
deleteTestLoans();
