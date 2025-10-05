const { pool } = require('./config/database');

async function removeUnusedAppraisalsTable() {
  try {
    console.log('🧹 Removing unused appraisals table...\n');
    
    // Check if appraisals table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'appraisals'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('ℹ️  appraisals table does not exist - nothing to remove');
      return;
    }
    
    // Check row count
    const rowCount = await pool.query('SELECT COUNT(*) as count FROM appraisals;');
    const count = rowCount.rows[0].count;
    
    console.log(`📊 appraisals table found with ${count} rows`);
    
    if (count > 0) {
      console.log('⚠️  appraisals table contains data - skipping deletion for safety');
      console.log('   Please manually review and remove data before deleting table');
      return;
    }
    
    // Table is empty, safe to remove
    console.log('✅ Table is empty - safe to remove');
    
    // Check for foreign key constraints
    const fkCheck = await pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'appraisals';
    `);
    
    if (fkCheck.rows.length > 0) {
      console.log('⚠️  Found foreign key references to appraisals table:');
      fkCheck.rows.forEach(row => {
        console.log(`   - ${row.table_name}.${row.column_name}`);
      });
      console.log('   Please remove foreign key constraints first');
      return;
    }
    
    // Drop the table
    await pool.query('DROP TABLE appraisals;');
    
    console.log('✅ appraisals table removed successfully');
    
    // Verify removal
    const verifyResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'appraisals'
      );
    `);
    
    if (!verifyResult.rows[0].exists) {
      console.log('✅ Verification: appraisals table no longer exists');
    } else {
      console.log('❌ Verification failed: appraisals table still exists');
    }
    
    // Show updated table count
    const finalCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    console.log(`\n📊 Database now has ${finalCount.rows[0].count} tables`);
    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error removing appraisals table:', error.message);
    throw error;
  } finally {
    pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  removeUnusedAppraisalsTable()
    .then(() => {
      console.log('\n✅ Table cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Table cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { removeUnusedAppraisalsTable };