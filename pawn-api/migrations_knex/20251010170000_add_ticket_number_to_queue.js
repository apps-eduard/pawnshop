/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.table('pawner_queue', (table) => {
    table.string('ticket_number', 50); // Add ticket number column (e.g., TXN-202510-000001)
    table.index('ticket_number'); // Index for faster lookups
  });

  console.log('✅ Added ticket_number column to pawner_queue table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('pawner_queue', (table) => {
    table.dropColumn('ticket_number');
  });

  console.log('✅ Removed ticket_number column from pawner_queue table');
};
