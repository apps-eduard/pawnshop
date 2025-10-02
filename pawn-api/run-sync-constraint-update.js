const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function updateSyncConstraint() {
  try {
    console.log('🔧 Updating sync_type constraint...');
    
    const sql = fs.readFileSync('./update-sync-constraint.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Constraint updated successfully!');
    
    // Verify the constraint
    const result = await pool.query(`
      SELECT COUNT(*) as count, sync_type 
      FROM branch_sync_log 
      GROUP BY sync_type 
      ORDER BY sync_type
    `);
    
    console.log('\n📋 Sync types in database:');
    result.rows.forEach(row => {
      console.log(`- ${row.sync_type}: ${row.count} entries`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateSyncConstraint();