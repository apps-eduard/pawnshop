const { pool } = require('./config/database');

async function addPawnerRole() {
  try {
    console.log('🔐 Adding Pawner Role to RBAC System...\n');
    
    // Check if pawner role already exists
    const existing = await pool.query(`SELECT id FROM roles WHERE name = 'pawner'`);
    if (existing.rows.length > 0) {
      console.log('✅ Pawner role already exists (ID: ' + existing.rows[0].id + ')');
      await pool.end();
      return;
    }
    
    // Insert pawner role
    const roleResult = await pool.query(`
      INSERT INTO roles (name, display_name, description, is_active)
      VALUES ('pawner', 'Pawner', 'Customer access - view own info and join queue', true)
      RETURNING id, name, display_name
    `);
    
    console.log('✅ Pawner role created:');
    console.log(`   ID: ${roleResult.rows[0].id}`);
    console.log(`   Name: ${roleResult.rows[0].name}`);
    console.log(`   Display Name: ${roleResult.rows[0].display_name}`);
    
    // Get Dashboard menu ID
    const dashboardMenu = await pool.query(`
      SELECT id FROM menu_items WHERE name = 'Dashboard'
    `);
    
    if (dashboardMenu.rows.length > 0) {
      // Assign Dashboard menu to pawner role
      await pool.query(`
        INSERT INTO role_menu_permissions (role_id, menu_item_id, can_view, can_create, can_edit, can_delete)
        VALUES ($1, $2, true, false, false, false)
      `, [roleResult.rows[0].id, dashboardMenu.rows[0].id]);
      
      console.log('✅ Assigned Dashboard menu to pawner role');
    }
    
    console.log('\n✅ Pawner role setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addPawnerRole();
