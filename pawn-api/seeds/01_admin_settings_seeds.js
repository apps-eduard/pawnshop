/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Insert default categories
  await knex('categories').insert([
    { name: 'Jewelry', description: 'Gold, silver, and precious metal items', interest_rate: 3.00 },
    { name: 'Appliances', description: 'Electronic appliances and gadgets', interest_rate: 6.00 }
  ]).onConflict('name').ignore();

  // Insert default loan rules
  await knex('loan_rules').insert([
    { 
      service_charge_rate: 0.0100, 
      minimum_service_charge: 5.00, 
      minimum_loan_for_service: 500.00 
    }
  ]);

  // Insert default voucher types
  await knex('voucher_types').insert([
    { code: 'CASH', type: 'cash', description: 'Cash payment voucher' },
    { code: 'CHEQUE', type: 'cheque', description: 'Cheque payment voucher' }
  ]).onConflict('code').ignore();

  // Insert default branches
  await knex('branches').insert([
    { 
      name: 'Main Branch', 
      code: 'MAIN', 
      address: 'Cebu City, Philippines',
      phone: '+63 32 123 4567',
      email: 'main@pawnshop.com',
      manager_name: 'Juan Dela Cruz'
    },
    { 
      name: 'Branch 2', 
      code: 'BR02', 
      address: 'Davao City, Philippines',
      phone: '+63 82 234 5678',
      email: 'br02@pawnshop.com',
      manager_name: 'Maria Santos'
    },
    { 
      name: 'Branch 3', 
      code: 'BR03', 
      address: 'Iloilo City, Philippines',
      phone: '+63 33 345 6789',
      email: 'br03@pawnshop.com',
      manager_name: 'Pedro Reyes'
    }
  ]).onConflict('code').ignore();

  console.log('✅ Admin settings seeded successfully!');
};
