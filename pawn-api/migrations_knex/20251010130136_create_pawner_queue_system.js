/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Create pawner_roles junction table (many-to-many between pawners and roles)
  await knex.schema.createTable('pawner_roles', (table) => {
    table.increments('id').primary();
    table.integer('pawner_id').unsigned().notNullable().references('id').inTable('pawners').onDelete('CASCADE');
    table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.boolean('is_primary').defaultTo(true);
    table.integer('assigned_by').unsigned().references('id').inTable('employees');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.unique(['pawner_id', 'role_id']);
    table.index('pawner_id');
    table.index('role_id');
  });

  // 2. Create pawner_queue table for customer queuing system
  await knex.schema.createTable('pawner_queue', (table) => {
    table.increments('id').primary();
    table.integer('pawner_id').unsigned().notNullable().references('id').inTable('pawners').onDelete('CASCADE');
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('SET NULL');
    
    // Queue information
    table.string('queue_number', 20); // e.g., "Q001", "Q002"
    table.enu('status', ['waiting', 'processing', 'completed', 'cancelled']).defaultTo('waiting');
    table.boolean('is_new_pawner').defaultTo(false); // True if pawner just created their account
    table.enu('service_type', ['new_loan', 'renew', 'redeem', 'additional_loan', 'inquiry']).notNullable();
    
    // Staff assignments
    table.integer('processed_by').unsigned().references('id').inTable('employees');
    table.timestamp('called_at'); // When pawner was called/started processing
    table.timestamp('completed_at'); // When service was completed
    
    // Metadata
    table.text('notes');
    table.integer('wait_time_minutes'); // Calculated wait time
    table.integer('service_time_minutes'); // Calculated service time
    
    // Timestamps
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('pawner_id');
    table.index('branch_id');
    table.index('status');
    table.index('joined_at');
    table.index(['branch_id', 'status', 'joined_at']); // Composite index for queue listing
  });

  console.log('✅ Created pawner_roles and pawner_queue tables');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('pawner_queue');
  await knex.schema.dropTableIfExists('pawner_roles');
  
  console.log('✅ Dropped pawner_roles and pawner_queue tables');
};
