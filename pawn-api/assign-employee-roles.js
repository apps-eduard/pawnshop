const { pool } = require('./config/database');

async function assignEmployeeRoles() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all employees and roles
    const employeesResult = await client.query('SELECT id, username, role FROM employees ORDER BY id');
    const rolesResult = await client.query('SELECT id, name FROM roles');
    
    const employees = employeesResult.rows;
    const roleMap = rolesResult.rows;
    
    console.log('\n📋 Employees:', employees);
    console.log('\n📋 Roles:', roleMap);
    
    // Map legacy role names to new role names
    const roleMappings = {
      'admin': 'administrator',
      'administrator': 'administrator',
      'manager': 'manager',
      'cashier': 'cashier',
      'appraiser': 'appraiser',
      'auctioneer': 'auctioneer'
    };
    
    for (const employee of employees) {
      // Map the employee's role to the correct role name
      const mappedRoleName = roleMappings[employee.role] || employee.role;
      const role = roleMap.find(r => r.name === mappedRoleName);
      
      if (role) {
        console.log(`✅ Assigning ${employee.username} (${employee.role}) → ${role.name}`);
        await client.query(`
          INSERT INTO employee_roles (employee_id, role_id, is_primary, assigned_by, assigned_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [employee.id, role.id, true, 1]);
      } else {
        console.log(`⚠️  Warning: Could not find role '${mappedRoleName}' for employee ${employee.id} (${employee.role})`);
      }
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Employee roles assigned successfully!');
    
    // Verify
    const verifyResult = await client.query(`
      SELECT e.username, e.role as legacy_role, r.name as assigned_role
      FROM employee_roles er
      JOIN employees e ON er.employee_id = e.id
      JOIN roles r ON er.role_id = r.id
      ORDER BY e.id
    `);
    
    console.log('\n📋 Verification:', verifyResult.rows);
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

assignEmployeeRoles();
