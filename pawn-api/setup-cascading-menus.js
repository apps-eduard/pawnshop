// Script to set up cascading menu structure
const { pool } = require('./config/database');

async function setupCascadingMenus() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔧 Setting up cascading menu structure...\n');

    // Step 1: Create parent menu items
    console.log('📁 Creating parent menus...');
    
    await client.query(`
      INSERT INTO menu_items (name, route, icon, parent_id, order_index, is_active, description, created_at, updated_at)
      VALUES 
        ('Management', '#', '📁', NULL, 2, true, 'Management section', NOW(), NOW()),
        ('Transactions', '#', '💰', NULL, 3, true, 'Transactions section', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // Step 2: Get parent IDs
    const managementResult = await client.query(
      `SELECT id FROM menu_items WHERE name = 'Management' AND parent_id IS NULL LIMIT 1`
    );
    const transactionsResult = await client.query(
      `SELECT id FROM menu_items WHERE name = 'Transactions' AND parent_id IS NULL AND route = '#' LIMIT 1`
    );

    if (managementResult.rows.length === 0 || transactionsResult.rows.length === 0) {
      throw new Error('Failed to create parent menus');
    }

    const managementId = managementResult.rows[0].id;
    const transactionsId = transactionsResult.rows[0].id;

    console.log(`✅ Management parent ID: ${managementId}`);
    console.log(`✅ Transactions parent ID: ${transactionsId}\n`);

    // Step 3: Update management children
    console.log('📝 Updating Management children...');
    
    const managementChildren = [
      { name: 'User Management', order: 1 },
      { name: 'Pawner Management', order: 2 },
      { name: 'Address Management', order: 3 },
      { name: 'Item Management', order: 4 },
      { route: '/management/vouchers', order: 5 } // Vouchers by route
    ];

    for (const child of managementChildren) {
      const whereClause = child.name ? `name = $2` : `route = $2`;
      const value = child.name || child.route;
      
      const result = await client.query(
        `UPDATE menu_items 
         SET parent_id = $1, order_index = $3, updated_at = NOW() 
         WHERE ${whereClause}
         RETURNING name`,
        [managementId, value, child.order]
      );
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${result.rows[0].name} → Management`);
      }
    }

    // Step 4: Update transaction children
    console.log('\n📝 Updating Transactions children...');
    
    const transactionChildren = [
      { name: 'Appraisal', order: 1 },
      { name: 'New Loan', order: 2 },
      { name: 'Additional Loan', order: 3 },
      { name: 'Partial Payment', order: 4 },
      { name: 'Redeem', order: 5 },
      { name: 'Renew', order: 6 },
      { name: 'Auction Items', order: 7 }
    ];

    for (const child of transactionChildren) {
      const result = await client.query(
        `UPDATE menu_items 
         SET parent_id = $1, order_index = $2, updated_at = NOW() 
         WHERE name = $3
         RETURNING name`,
        [transactionsId, child.order, child.name]
      );
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${result.rows[0].name} → Transactions`);
      }
    }

    // Step 5: Hide the old flat Transactions menu item (id=2)
    console.log('\n🔧 Hiding old flat Transactions menu...');
    await client.query(
      `UPDATE menu_items SET is_active = false WHERE id = 2 AND route = '/transactions'`
    );

    await client.query('COMMIT');

    // Step 6: Display final structure
    console.log('\n📋 Final menu structure:');
    const finalResult = await client.query(`
      SELECT 
        m1.id,
        m1.name,
        m1.route,
        m1.parent_id,
        m2.name as parent_name,
        m1.order_index,
        m1.is_active
      FROM menu_items m1
      LEFT JOIN menu_items m2 ON m1.parent_id = m2.id
      WHERE m1.is_active = true
      ORDER BY COALESCE(m1.parent_id, m1.id), m1.order_index
    `);

    console.table(finalResult.rows);

    console.log('\n✅ Cascading menu structure setup complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupCascadingMenus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
