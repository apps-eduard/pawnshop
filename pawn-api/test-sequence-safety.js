const { pool } = require('./config/database');

async function demonstrateSequenceSafety() {
  try {
    console.log('🔒 Demonstrating Sequence Safety After Restart...\n');
    
    // Show current sequence state
    const sequences = await pool.query(`
      SELECT branch_id, sequence_type, current_number, year, month, last_reset_date
      FROM transaction_sequences 
      WHERE sequence_type = 'TICKET' AND branch_id = 1
      ORDER BY year DESC, month DESC
    `);
    
    console.log('📊 Current Sequence State:');
    console.table(sequences.rows);
    
    // Simulate restart by showing sequence persistence
    console.log('\n🔄 After PC restart, sequence continues from database:');
    
    const currentSeq = await pool.query(`
      SELECT current_number FROM transaction_sequences 
      WHERE branch_id = 1 AND sequence_type = 'TICKET' AND year = 2025
    `);
    
    if (currentSeq.rows.length > 0) {
      console.log(`✅ Next ticket number will be: ${currentSeq.rows[0].current_number + 1}`);
    }
    
    // Show atomic increment operation
    console.log('\n⚡ Atomic increment operation:');
    const result = await pool.query(`
      UPDATE transaction_sequences 
      SET current_number = current_number + 1 
      WHERE branch_id = 1 AND sequence_type = 'TICKET' AND year = 2025
      RETURNING current_number, id
    `);
    
    console.log(`🎫 Generated sequence number: ${result.rows[0].current_number}`);
    console.log('✅ This number is guaranteed unique even after restart!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

demonstrateSequenceSafety();