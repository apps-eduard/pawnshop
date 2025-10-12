/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing employee_roles
  await knex('employee_roles').del();

  // Get all employees and roles
  const employees = await knex('employees').select('id', 'username', 'role');
  const roles = await knex('roles').select('id', 'name');
  
  // Map legacy role names to new role names
  const roleMappings = {
    'admin': 'administrator',
    'administrator': 'administrator',
    'manager': 'manager',
    'cashier': 'cashier',
    'appraiser': 'appraiser',
    'auctioneer': 'auctioneer',
    'pawner': 'pawner'
  };
  
  const employeeRoles = [];
  
  for (const employee of employees) {
    // Map the employee's role to the correct role name
    const mappedRoleName = roleMappings[employee.role] || employee.role;
    const role = roles.find(r => r.name === mappedRoleName);
    
    if (role) {
      console.log(`✅ Assigning ${employee.username} (${employee.role}) → ${role.name}`);
      employeeRoles.push({
        employee_id: employee.id,
        role_id: role.id,
        is_primary: true,
        assigned_by: 1, // Admin user
        assigned_at: knex.fn.now()
      });
    } else {
      console.log(`⚠️  Warning: Could not find role '${mappedRoleName}' for employee ${employee.username} (${employee.role})`);
    }
  }
  
  // Insert all employee roles
  if (employeeRoles.length > 0) {
    await knex('employee_roles').insert(employeeRoles);
    console.log(`✅ Assigned roles to ${employeeRoles.length} employees`);
  }
};
