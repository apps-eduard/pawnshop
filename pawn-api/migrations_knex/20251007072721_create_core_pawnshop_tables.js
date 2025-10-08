/**
 * Core Pawnshop Tables Migration
 * Creates: employees, pawners, transactions, pawn_tickets, pawn_items, and supporting tables
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Create employees table (required by other tables)
  await knex.schema.createTable('employees', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 50).notNullable();
    table.string('middle_name', 50);
    table.string('last_name', 50).notNullable();
    table.string('email', 100).unique();
    table.string('mobile_number', 20);
    table.string('role', 20).notNullable(); // admin, cashier, manager, appraiser, auctioneer
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. Create pawners (customers) table
  await knex.schema.createTable('pawners', (table) => {
    table.increments('id').primary();
    table.string('customer_code', 20).unique();
    table.string('first_name', 50).notNullable();
    table.string('middle_name', 50);
    table.string('last_name', 50).notNullable();
    table.string('suffix', 10);
    table.date('birth_date');
    table.string('gender', 10);
    table.string('civil_status', 20);
    table.string('nationality', 50).defaultTo('Filipino');
    table.string('mobile_number', 20);
    table.string('email', 100);
    table.string('house_number', 20);
    table.string('street', 100);
    table.integer('barangay_id').unsigned().references('id').inTable('barangays');
    table.integer('city_id').unsigned().references('id').inTable('cities');
    table.string('province', 50);
    table.string('postal_code', 10);
    table.string('id_type', 50);
    table.string('id_number', 100);
    table.date('id_expiry_date');
    table.string('occupation', 100);
    table.decimal('monthly_income', 15, 2);
    table.string('emergency_contact_name', 100);
    table.string('emergency_contact_number', 20);
    table.string('emergency_contact_relationship', 50);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_blacklisted').defaultTo(false);
    table.text('blacklist_reason');
    table.text('notes');
    table.string('photo_url', 255);
    table.string('signature_url', 255);
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.integer('created_by').unsigned().references('id').inTable('employees');
    table.integer('updated_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 3. Create transactions table (MAIN TABLE with granted_date and partial payment fields)
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.string('transaction_number', 50).notNullable().unique();
    table.string('loan_number', 50).unique();
    table.integer('pawner_id').unsigned().notNullable().references('id').inTable('pawners');
    table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    table.string('transaction_type', 20).notNullable();
    table.string('status', 20).notNullable().defaultTo('active');
    
    // Financial Information
    table.decimal('principal_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('interest_rate', 5, 4).notNullable().defaultTo(0);
    table.decimal('interest_amount', 15, 2).defaultTo(0);
    table.decimal('penalty_rate', 5, 4).defaultTo(0);
    table.decimal('penalty_amount', 15, 2).defaultTo(0);
    table.decimal('service_charge', 15, 2).defaultTo(0);
    table.decimal('other_charges', 15, 2).defaultTo(0);
    table.decimal('total_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('amount_paid', 15, 2).defaultTo(0);
    table.decimal('balance', 15, 2).defaultTo(0);
    
    // **Partial Payment Fields** (5 new fields)
    table.decimal('discount_amount', 10, 2).defaultTo(0);
    table.decimal('advance_interest', 10, 2).defaultTo(0);
    table.decimal('advance_service_charge', 10, 2).defaultTo(0);
    table.decimal('net_payment', 10, 2).defaultTo(0);
    table.decimal('new_principal_loan', 10, 2);
    
    // **Dates** (including granted_date)
    table.timestamp('transaction_date').defaultTo(knex.fn.now());
    table.timestamp('granted_date'); // **NEW: Original loan grant date**
    table.date('maturity_date').notNullable();
    table.date('expiry_date').notNullable();
    table.timestamp('last_payment_date');
    
    // **Tracking Number Chain** (NEW ARCHITECTURE)
    table.string('tracking_number', 50); // Original ticket number linking all related transactions
    table.string('previous_transaction_number', 50); // Previous transaction in chain
    
    // Parent Transaction (DEPRECATED - kept for backward compatibility)
    table.integer('parent_transaction_id').unsigned().references('id').inTable('transactions');
    
    // Status Tracking
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_expired').defaultTo(false);
    table.integer('days_overdue').defaultTo(0);
    
    // Notes
    table.text('notes');
    table.text('terms_conditions');
    
    // Audit Fields
    table.integer('created_by').unsigned().references('id').inTable('employees');
    table.integer('updated_by').unsigned().references('id').inTable('employees');
    table.integer('approved_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for tracking number chain
    table.index('tracking_number', 'idx_transactions_tracking_number');
    table.index('previous_transaction_number', 'idx_transactions_previous_transaction');
  });

  // 4. Create pawn_tickets table
  await knex.schema.createTable('pawn_tickets', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().notNullable().references('id').inTable('transactions');
    table.string('ticket_number', 50).notNullable().unique();
    table.string('status', 20).defaultTo('active');
    table.integer('print_count').defaultTo(0);
    table.timestamp('last_printed_at');
    table.integer('printed_by').unsigned().references('id').inTable('employees');
    table.jsonb('ticket_data');
    
    // Partial Payment Fields
    table.decimal('partial_payment', 10, 2).defaultTo(0.00);
    table.decimal('new_principal_loan', 10, 2);
    table.decimal('discount_amount', 10, 2).defaultTo(0.00);
    table.decimal('advance_interest', 10, 2).defaultTo(0.00);
    table.decimal('net_payment', 10, 2).defaultTo(0.00);
    table.decimal('payment_amount', 10, 2).defaultTo(0.00);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 5. Create pawn_items table
  await knex.schema.createTable('pawn_items', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().notNullable().references('id').inTable('transactions');
    table.integer('category_id').unsigned().notNullable().references('id').inTable('categories');
    table.integer('description_id').unsigned().references('id').inTable('descriptions');
    table.text('custom_description');
    table.string('brand', 100);
    table.string('model', 100);
    table.string('serial_number', 100);
    table.string('color', 50);
    table.string('size_dimensions', 100);
    table.decimal('weight', 10, 3);
    table.string('karat', 10);
    table.string('metal_type', 50);
    table.string('stone_type', 100);
    table.integer('stone_count');
    table.string('item_condition', 50).defaultTo('good');
    table.text('defects');
    table.text('accessories');
    table.decimal('appraised_value', 15, 2).notNullable();
    table.decimal('loan_amount', 15, 2).notNullable();
    table.text('appraisal_notes');
    table.string('status', 20).defaultTo('in_vault');
    table.string('location', 100);
    table.specificType('photo_urls', 'TEXT[]');
    table.integer('appraised_by').unsigned().references('id').inTable('employees');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 6. Create item_appraisals table
  await knex.schema.createTable('item_appraisals', (table) => {
    table.increments('id').primary();
    table.integer('pawner_id').unsigned().notNullable().references('id').inTable('pawners');
    table.integer('appraiser_id').unsigned().references('id').inTable('employees');
    table.string('category', 100).notNullable();
    table.text('description').notNullable();
    table.text('notes');
    table.decimal('estimated_value', 15, 2).notNullable();
    table.string('status', 20).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 7. Create audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('employees');
    table.string('action', 100).notNullable();
    table.string('entity_type', 50);
    table.integer('entity_id');
    table.text('description');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.jsonb('changes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 8. Create audit_trails table
  await knex.schema.createTable('audit_trails', (table) => {
    table.increments('id').primary();
    table.integer('transaction_id').unsigned().references('id').inTable('transactions');
    table.string('action', 50).notNullable();
    table.jsonb('old_data');
    table.jsonb('new_data');
    table.integer('performed_by').unsigned().references('id').inTable('employees');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  console.log('✅ Core pawnshop tables created successfully!');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('audit_trails');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('item_appraisals');
  await knex.schema.dropTableIfExists('pawn_items');
  await knex.schema.dropTableIfExists('pawn_tickets');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('pawners');
  await knex.schema.dropTableIfExists('employees');
};
