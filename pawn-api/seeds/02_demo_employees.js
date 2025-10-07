/**
 * Demo Employees Seed
 * Creates demo user accounts for each role
 * Passwords are hashed using bcrypt (all passwords: password123)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // Get branch IDs
  const branches = await knex('branches').select('id', 'code');
  const mainBranch = branches.find(b => b.code === 'MAIN');
  const br02 = branches.find(b => b.code === 'BR02');
  const br03 = branches.find(b => b.code === 'BR03');

  // Hash password (password123 for all demo accounts)
  const passwordHash = await bcrypt.hash('password123', 10);

  // Demo employees data
  const employees = [
    {
      username: 'admin',
      password_hash: passwordHash,
      first_name: 'System',
      middle_name: null,
      last_name: 'Administrator',
      email: 'admin@pawnshop.com',
      mobile_number: '09171234567',
      role: 'admin',
      branch_id: mainBranch?.id || 1,
      is_active: true
    },
    {
      username: 'cashier1',
      password_hash: passwordHash,
      first_name: 'Maria',
      middle_name: 'Santos',
      last_name: 'Cruz',
      email: 'cashier1@pawnshop.com',
      mobile_number: '09181234567',
      role: 'cashier',
      branch_id: mainBranch?.id || 1,
      is_active: true
    },
    {
      username: 'cashier2',
      password_hash: passwordHash,
      first_name: 'Juan',
      middle_name: 'Dela',
      last_name: 'Cruz',
      email: 'cashier2@pawnshop.com',
      mobile_number: '09191234567',
      role: 'cashier',
      branch_id: br02?.id || 2,
      is_active: true
    },
    {
      username: 'manager1',
      password_hash: passwordHash,
      first_name: 'Roberto',
      middle_name: 'Garcia',
      last_name: 'Reyes',
      email: 'manager1@pawnshop.com',
      mobile_number: '09201234567',
      role: 'manager',
      branch_id: mainBranch?.id || 1,
      is_active: true
    },
    {
      username: 'appraiser1',
      password_hash: passwordHash,
      first_name: 'Elena',
      middle_name: 'Torres',
      last_name: 'Mendoza',
      email: 'appraiser1@pawnshop.com',
      mobile_number: '09211234567',
      role: 'appraiser',
      branch_id: mainBranch?.id || 1,
      is_active: true
    },
    {
      username: 'appraiser2',
      password_hash: passwordHash,
      first_name: 'Carlos',
      middle_name: 'Ramos',
      last_name: 'Santos',
      email: 'appraiser2@pawnshop.com',
      mobile_number: '09221234567',
      role: 'appraiser',
      branch_id: br03?.id || 3,
      is_active: true
    },
    {
      username: 'auctioneer1',
      password_hash: passwordHash,
      first_name: 'Rafael',
      middle_name: 'Lopez',
      last_name: 'Gonzales',
      email: 'auctioneer1@pawnshop.com',
      mobile_number: '09231234567',
      role: 'auctioneer',
      branch_id: mainBranch?.id || 1,
      is_active: true
    }
  ];

  // Insert employees (skip if already exists)
  for (const employee of employees) {
    await knex('employees')
      .insert(employee)
      .onConflict('username')
      .ignore();
  }

  console.log('✅ Demo employees seeded successfully!');
  console.log('   Username: admin | Password: password123');
  console.log('   Username: cashier1 | Password: password123');
  console.log('   Username: cashier2 | Password: password123');
  console.log('   Username: manager1 | Password: password123');
  console.log('   Username: appraiser1 | Password: password123');
  console.log('   Username: appraiser2 | Password: password123');
  console.log('   Username: auctioneer1 | Password: password123');
};
