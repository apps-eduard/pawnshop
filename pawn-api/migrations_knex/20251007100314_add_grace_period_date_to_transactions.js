/**
 * Migration: Add grace_period_date to transactions table
 * 
 * Purpose:
 * - Add grace_period_date column (maturity_date + 3 days)
 * - This represents the 3-day grace period after maturity
 * - Within this period, customers get discount on penalties
 * - After grace period (day 4+), full month penalty applies and ticket expires
 * 
 * Business Rules:
 * - Days 1-3 after maturity: Grace period, discount applies
 * - Day 4+: Grace period ends, no discount, ticket expires
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('transactions', function(table) {
    // Add grace_period_date column (maturity_date + 3 days)
    table.date('grace_period_date')
      .nullable()
      .comment('Grace period end date (maturity_date + 3 days). Tickets can be redeemed/renewed until this date with discount.');
    
    console.log('✅ Added grace_period_date column to transactions table');
  })
  .then(() => {
    // Update existing transactions to set grace_period_date
    return knex.raw(`
      UPDATE transactions 
      SET grace_period_date = maturity_date + INTERVAL '3 days'
      WHERE maturity_date IS NOT NULL AND grace_period_date IS NULL
    `);
  })
  .then(() => {
    console.log('✅ Updated existing transactions with grace_period_date values');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('transactions', function(table) {
    table.dropColumn('grace_period_date');
    console.log('✅ Dropped grace_period_date column from transactions table');
  });
};
