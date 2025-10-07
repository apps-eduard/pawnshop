/**
 * Payment, Penalty, Service Charge, and Config Tables Migration
 * Creates: system_config, transaction_sequences, pawn_payments, penalty tables, service charge tables, branch_sync_log
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Create system_config table
  await knex.schema.createTable('system_config', (table) => {
    table.increments('id').primary();
    table.string('config_key', 100).notNullable().unique();
    table.text('config_value');
    table.text('description');
    table.string('data_type', 20).defaultTo('string'); // string, number, boolean, json
    table.boolean('is_editable').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. Create transaction_sequences table
  await knex.schema.createTable('transaction_sequences', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.string('sequence_type', 50).notNullable(); // LOAN, PAYMENT, RENEWAL, etc.
    table.integer('current_number').defaultTo(0);
    table.string('prefix', 10).defaultTo('');
    table.string('suffix', 10).defaultTo('');
    table.integer('year').defaultTo(knex.raw('EXTRACT(year FROM CURRENT_DATE)'));
    table.integer('month').defaultTo(knex.raw('EXTRACT(month FROM CURRENT_DATE)'));
    table.string('reset_frequency', 20).defaultTo('yearly'); // daily, monthly, yearly, never
    table.date('last_reset_date').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['branch_id', 'sequence_type', 'year', 'month']);
  });

  // 3. Create pawn_payments table
  await knex.schema.createTable('pawn_payments', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().notNullable().references('id').inTable('transactions');
    
    // Payment Details
    table.string('payment_number', 50).notNullable().unique();
    table.string('payment_type', 20).notNullable(); // interest, partial_redemption, full_redemption, penalty, service_charge
    table.string('payment_method', 20).defaultTo('cash'); // cash, check, bank_transfer, gcash, paymaya, credit_card
    
    // Amount Breakdown
    table.decimal('amount', 15, 2).notNullable();
    table.decimal('principal_payment', 15, 2).defaultTo(0);
    table.decimal('interest_payment', 15, 2).defaultTo(0);
    table.decimal('penalty_payment', 15, 2).defaultTo(0);
    table.decimal('service_charge_payment', 15, 2).defaultTo(0);
    
    // Payment Period
    table.date('period_from');
    table.date('period_to');
    
    // Payment References
    table.string('reference_number', 100); // Check number, bank ref, etc.
    table.string('bank_name', 100);
    
    // Receipt Information
    table.string('receipt_number', 50);
    table.boolean('receipt_printed').defaultTo(false);
    table.timestamp('receipt_printed_at');
    
    // Payment Status
    table.string('status', 20).defaultTo('completed'); // pending, completed, cancelled, refunded
    
    // Notes
    table.text('notes');
    
    // Audit Fields
    table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    table.integer('received_by').unsigned().notNullable().references('id').inTable('employees');
    table.integer('approved_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 4. Create penalty_config table
  await knex.schema.createTable('penalty_config', (table) => {
    table.increments('id').primary();
    table.string('config_key', 100).notNullable().unique();
    table.decimal('config_value', 15, 4).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.date('effective_date').defaultTo(knex.fn.now());
    table.integer('created_by').unsigned().references('id').inTable('employees');
    table.integer('updated_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 5. Create penalty_calculation_log table
  await knex.schema.createTable('penalty_calculation_log', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().references('id').inTable('transactions');
    table.date('calculation_date').notNullable();
    table.decimal('principal_amount', 15, 2).notNullable();
    table.integer('days_overdue').notNullable();
    table.decimal('penalty_rate', 5, 4).notNullable();
    table.decimal('penalty_amount', 15, 2).notNullable();
    table.string('calculation_method', 50).notNullable(); // daily or monthly
    table.jsonb('config_snapshot'); // Store the config used
    table.integer('calculated_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 6. Create service_charge_brackets table
  await knex.schema.createTable('service_charge_brackets', (table) => {
    table.increments('id').primary();
    table.string('bracket_name', 100).notNullable();
    table.decimal('min_amount', 15, 2).notNullable();
    table.decimal('max_amount', 15, 2); // NULL means no upper limit
    table.decimal('service_charge', 15, 2).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.date('effective_date').defaultTo(knex.fn.now());
    table.integer('created_by').unsigned().references('id').inTable('employees');
    table.integer('updated_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['min_amount', 'max_amount']);
  });

  // 7. Create service_charge_config table
  await knex.schema.createTable('service_charge_config', (table) => {
    table.increments('id').primary();
    table.string('config_key', 100).notNullable().unique();
    table.decimal('config_value', 15, 4).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.date('effective_date').defaultTo(knex.fn.now());
    table.integer('created_by').unsigned().references('id').inTable('employees');
    table.integer('updated_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 8. Create service_charge_calculation_log table
  await knex.schema.createTable('service_charge_calculation_log', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().references('id').inTable('transactions');
    table.date('calculation_date').notNullable();
    table.decimal('principal_amount', 15, 2).notNullable();
    table.decimal('service_charge_amount', 15, 2).notNullable();
    table.string('calculation_method', 50).notNullable(); // bracket, percentage, fixed
    table.string('bracket_used', 100); // Which bracket was applied
    table.jsonb('config_snapshot'); // Store the config used
    table.integer('calculated_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 9. Create branch_sync_log table
  await knex.schema.createTable('branch_sync_log', (table) => {
    table.increments('id').primary();
    table.integer('source_branch_id').unsigned().references('id').inTable('branches');
    table.integer('target_branch_id').unsigned().references('id').inTable('branches');
    
    // Sync Details
    table.string('sync_type', 50).notNullable(); // full_sync, incremental, table_specific
    table.string('table_name', 100);
    table.string('operation', 20); // INSERT, UPDATE, DELETE
    
    // Record Information
    table.integer('record_id');
    table.jsonb('record_data');
    
    // Sync Status
    table.string('status', 20).defaultTo('pending'); // pending, success, failed, skipped
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    
    // Timing
    table.timestamp('sync_started_at').defaultTo(knex.fn.now());
    table.timestamp('sync_completed_at');
    
    // Metadata
    table.string('sync_batch_id', 100);
    table.integer('priority').defaultTo(1);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  console.log('✅ Payment, penalty, service charge, and config tables created successfully!');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('branch_sync_log');
  await knex.schema.dropTableIfExists('service_charge_calculation_log');
  await knex.schema.dropTableIfExists('service_charge_config');
  await knex.schema.dropTableIfExists('service_charge_brackets');
  await knex.schema.dropTableIfExists('penalty_calculation_log');
  await knex.schema.dropTableIfExists('penalty_config');
  await knex.schema.dropTableIfExists('pawn_payments');
  await knex.schema.dropTableIfExists('transaction_sequences');
  await knex.schema.dropTableIfExists('system_config');
};
