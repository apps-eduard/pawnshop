// Script to update voucher menu route in database
const { pool } = require('./config/database');

async function updateVoucherRoute() {
  try {
    console.log('🔍 Checking current voucher menu item...');
    
    // Check current route
    const currentResult = await pool.query(
      `SELECT id, name, route, icon, parent_id, order_index 
       FROM menu_items 
       WHERE name ILIKE '%Voucher%' OR route ILIKE '%voucher%'`
    );
    
    console.log('📋 Current voucher menu items:', JSON.stringify(currentResult.rows, null, 2));
    
    if (currentResult.rows.length === 0) {
      console.log('⚠️  No voucher menu items found');
      await pool.end();
      process.exit(0);
    }
    
    // Update the route
    console.log('\n🔄 Updating voucher route to /management/vouchers...');
    const updateResult = await pool.query(
      `UPDATE menu_items 
       SET route = '/management/vouchers', updated_at = NOW() 
       WHERE route = '/vouchers' OR name = 'Vouchers'
       RETURNING id, name, route`
    );
    
    console.log(`✅ Updated ${updateResult.rowCount} row(s)`);
    
    // Verify the update
    const verifyResult = await pool.query(
      `SELECT id, name, route, icon, parent_id, order_index 
       FROM menu_items 
       WHERE route = '/management/vouchers'`
    );
    
    console.log('\n✅ Updated voucher menu items:', JSON.stringify(verifyResult.rows, null, 2));
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

updateVoucherRoute();
