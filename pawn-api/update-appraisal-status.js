const { pool } = require('./config/database');

async function updateAppraisalStatus() {
  try {
    console.log('🔄 Updating appraisal statuses for testing...');
    
    // Update first two appraisals to completed
    await pool.query(`
      UPDATE appraisals 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (1, 2)
    `, ['completed']);
    
    console.log('✅ Updated appraisals 1 and 2 to completed status');
    
    // Get updated counts
    const counts = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM appraisals 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('📊 Updated appraisal counts:');
    counts.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count}`);
    });
    
    // Test pending ready endpoint
    const pendingReady = await pool.query(`
      SELECT a.id, a.status, 
             CONCAT(p.first_name, ' ', p.last_name) as pawner_name,
             a.estimated_value, a.item_category
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.status = 'completed'
      AND a.id NOT IN (
        SELECT DISTINCT appraisal_id 
        FROM transactions 
        WHERE appraisal_id IS NOT NULL
      )
      ORDER BY a.created_at DESC
    `);
    
    console.log(`\n💎 Found ${pendingReady.rows.length} appraisals ready for transaction:`);
    pendingReady.rows.forEach(appraisal => {
      console.log(`   - ID: ${appraisal.id} | ${appraisal.pawner_name} | ${appraisal.item_category} | ₱${appraisal.estimated_value}`);
    });
    
    await pool.end();
    console.log('\n🎉 Appraisal status update completed!');
    
  } catch (error) {
    console.error('❌ Error updating appraisal status:', error);
    await pool.end();
  }
}

updateAppraisalStatus();