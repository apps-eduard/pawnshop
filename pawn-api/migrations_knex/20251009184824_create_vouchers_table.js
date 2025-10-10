/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const exists = await knex.schema.hasTable('vouchers');
  if (exists) {
    console.log('✅ Table vouchers already exists, skipping creation');
    return;
  }

  // Create vouchers table
  await knex.schema.createTable('vouchers', (table) => {
    table.increments('id').primary();
    table.string('voucher_type', 10).notNullable().checkIn(['cash', 'cheque']);
    table.date('voucher_date').notNullable();
    table.decimal('amount', 15, 2).notNullable().checkPositive();
    table.text('notes').notNullable();
    table.integer('created_by').unsigned();
    table.timestamps(true, true); // created_at and updated_at

    // Indexes for better performance
    table.index('voucher_date');
    table.index('created_by');
    table.index('voucher_type');
    table.index('created_at');
  });

  console.log('✅ Created vouchers table with indexes');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('vouchers');
  console.log('✅ Dropped vouchers table');
};
