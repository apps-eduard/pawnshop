const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function createPawnerEmployee() {
  try {
    // Check if pawner employee exists
    const existing = await pool.query(
      "SELECT id FROM employees WHERE username = 'pawner'"
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Pawner employee already exists');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Get branch (use first branch)
    const branch = await pool.query('SELECT id FROM branches LIMIT 1');
    const branchId = branch.rows[0]?.id || 1;

    // Insert pawner employee
    const result = await pool.query(`
      INSERT INTO employees (username, password_hash, first_name, last_name, branch_id, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, first_name, last_name
    `, ['pawner', hashedPassword, 'Pawner', 'Kiosk', branchId, 'pawner', true]);

    const employeeId = result.rows[0].id;
    console.log('✅ Created pawner employee:', result.rows[0]);

    // Get pawner role
    const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'pawner'");
    
    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;

      // Assign pawner role
      await pool.query(`
        INSERT INTO employee_roles (employee_id, role_id, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [employeeId, roleId, true]);

      console.log('✅ Assigned pawner role to employee');
    } else {
      console.log('⚠️  Pawner role not found');
    }

    console.log('\n🎉 Pawner employee account created successfully!');
    console.log('   Username: pawner');
    console.log('   Password: password123');
    console.log('   Purpose: Mock login for testing queue kiosk');

    process.exit(0);
  } catch (error) {
    console.error('Error creating pawner employee:', error);
    process.exit(1);
  }
}

createPawnerEmployee();
