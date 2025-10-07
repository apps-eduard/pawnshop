/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create categories table
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.decimal('interest_rate', 5, 2).notNullable().defaultTo(0.00);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create loan_rules table
  await knex.schema.createTable('loan_rules', (table) => {
    table.increments('id').primary();
    table.decimal('service_charge_rate', 5, 4).notNullable().defaultTo(0.0100);
    table.decimal('minimum_service_charge', 10, 2).notNullable().defaultTo(5.00);
    table.decimal('minimum_loan_for_service', 12, 2).notNullable().defaultTo(500.00);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create voucher_types table
  await knex.schema.createTable('voucher_types', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('type', 50).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create branches table
  await knex.schema.createTable('branches', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('code', 20).notNullable().unique();
    table.text('address').notNullable();
    table.string('phone', 20);
    table.string('email', 100);
    table.string('manager_name', 100);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create cities table
  await knex.schema.createTable('cities', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('province', 100).notNullable();
    table.string('region', 100);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['name', 'province']);
  });

  // Create barangays table
  await knex.schema.createTable('barangays', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('city_id').unsigned().references('id').inTable('cities').onDelete('CASCADE');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['name', 'city_id']);
  });

  // Create descriptions table
  await knex.schema.createTable('descriptions', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.text('notes');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order (considering foreign keys)
  await knex.schema.dropTableIfExists('descriptions');
  await knex.schema.dropTableIfExists('barangays');
  await knex.schema.dropTableIfExists('cities');
  await knex.schema.dropTableIfExists('branches');
  await knex.schema.dropTableIfExists('voucher_types');
  await knex.schema.dropTableIfExists('loan_rules');
  await knex.schema.dropTableIfExists('categories');
};
