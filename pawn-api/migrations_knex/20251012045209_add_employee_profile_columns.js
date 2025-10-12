/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add profile columns to employees table
  await knex.schema.alterTable('employees', (table) => {
    // Position/title of the employee
    table.string('position', 100).nullable().comment('Employee position or job title');
    
    // Contact number (using same as mobile_number but keeping for compatibility)
    table.string('contact_number', 20).nullable().comment('Additional contact number');
    
    // Physical address
    table.text('address').nullable().comment('Employee physical address');
    
    // Add index for better query performance
    table.index('position', 'idx_employees_position');
  });
  
  console.log('✅ Added position, contact_number, and address columns to employees table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove the added columns
  await knex.schema.alterTable('employees', (table) => {
    table.dropIndex('position', 'idx_employees_position');
    table.dropColumn('position');
    table.dropColumn('contact_number');
    table.dropColumn('address');
  });
  
  console.log('✅ Removed position, contact_number, and address columns from employees table');
};
