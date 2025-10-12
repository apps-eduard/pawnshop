/**
 * Migration: Add transaction_type field to vouchers table
 * Purpose: Differentiate between Cash IN and Cash OUT vouchers for daily cash position reporting
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 Adding transaction_type field to vouchers table...');
  
  await knex.schema.alterTable('vouchers', (table) => {
    // Add transaction_type column
    table.string('transaction_type', 10)
      .notNullable()
      .defaultTo('cash_out')
      .checkIn(['cash_in', 'cash_out'])
      .comment('Specifies if voucher is for Cash IN (receipts) or Cash OUT (disbursements)');
    
    // Add index for better query performance
    table.index('transaction_type');
  });
  
  console.log('✅ Added transaction_type field to vouchers table');
  console.log('   - transaction_type: cash_in | cash_out');
  console.log('   - Default: cash_out (for backward compatibility)');
  console.log('   - Indexed for faster queries');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('vouchers', (table) => {
    table.dropIndex('transaction_type');
    table.dropColumn('transaction_type');
  });
  
  console.log('✅ Removed transaction_type field from vouchers table');
};
