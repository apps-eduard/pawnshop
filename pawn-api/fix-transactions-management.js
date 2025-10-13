const { pool } = require('./config/database');

async function fixTransactionsManagement() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Fixing old Transactions Management menu...');
    
    // Check current state
    const current = await client.query(`
      SELECT id, name, route, parent_id, is_active 
      FROM menu_items 
      WHERE id = 2
    `);
    
    console.log('\n📋 Current state:');
    console.table(current.rows);
    
    // Set it to inactive and remove parent_id
    await client.query(`
      UPDATE menu_items 
      SET is_active = false, parent_id = NULL
      WHERE id = 2
    `);
    
    console.log('✅ Set to inactive and removed from Management parent');
    
    // Verify
    const updated = await client.query(`
      SELECT id, name, route, parent_id, is_active 
      FROM menu_items 
      WHERE id = 2
    `);
    
    console.log('\n📋 Updated state:');
    console.table(updated.rows);
    
    // Show Management children now
    console.log('\n📋 Management children after fix:');
    const children = await client.query(`
      SELECT id, name, route, order_index, is_active
      FROM menu_items 
      WHERE parent_id = 18
      ORDER BY order_index
    `);
    console.table(children.rows);
    
    await client.query('COMMIT');
    console.log('\n✅ Fix complete! Refresh your browser.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTransactionsManagement();
