/**
 * Migration: Add partial_payment to service_type enum in pawner_queue table
 * 
 * This migration adds 'partial_payment' as a valid service type for the queue system.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Drop the old constraint
  await knex.raw(`
    ALTER TABLE pawner_queue 
    DROP CONSTRAINT IF EXISTS pawner_queue_service_type_check
  `);
  
  // Add new constraint with partial_payment included
  await knex.raw(`
    ALTER TABLE pawner_queue 
    ADD CONSTRAINT pawner_queue_service_type_check 
    CHECK (service_type IN ('new_loan', 'renew', 'redeem', 'additional_loan', 'inquiry', 'partial_payment'))
  `);

  console.log('✅ Added partial_payment to service_type enum in pawner_queue table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop and recreate constraint without partial_payment
  await knex.raw(`
    ALTER TABLE pawner_queue 
    DROP CONSTRAINT IF EXISTS pawner_queue_service_type_check
  `);
  
  await knex.raw(`
    ALTER TABLE pawner_queue 
    ADD CONSTRAINT pawner_queue_service_type_check 
    CHECK (service_type IN ('new_loan', 'renew', 'redeem', 'additional_loan', 'inquiry'))
  `);

  console.log('✅ Removed partial_payment from service_type enum in pawner_queue table');
};
