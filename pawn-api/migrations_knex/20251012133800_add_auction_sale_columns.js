/**
 * Migration: Add Auction Sale Columns to pawn_items
 * Adds columns needed to track auction sale details using pawner table reference
 */

exports.up = async function(knex) {
  console.log('🔧 Adding auction sale columns to pawn_items table...');
  
  // Check if columns already exist
  const hasColumns = await knex.schema.hasColumn('pawn_items', 'buyer_id');
  
  if (hasColumns) {
    console.log('✅ Auction sale columns already exist');
    return;
  }
  
  await knex.schema.table('pawn_items', (table) => {
    // Buyer information - reference to pawners table
    // This will be set after creating/finding the pawner record
    table.integer('buyer_id').unsigned().nullable()
      .references('id').inTable('pawners').onDelete('SET NULL')
      .comment('Foreign key to pawners table - buyer who purchased the item');
    
    // Sale pricing details
    table.decimal('discount_amount', 15, 2).nullable().defaultTo(0)
      .comment('Discount applied to auction price');
    table.decimal('final_price', 15, 2).nullable()
      .comment('Final sale price after discount');
    
    // Payment details
    table.decimal('received_amount', 15, 2).nullable().defaultTo(0)
      .comment('Amount received from buyer');
    
    // Additional notes
    table.text('sale_notes').nullable()
      .comment('Additional notes about the sale');
    
    // Index for buyer lookups
    table.index('buyer_id');
  });
  
  console.log('✅ Successfully added auction sale columns to pawn_items table');
  console.log('   - buyer_id (FK to pawners)');
  console.log('   - discount_amount');
  console.log('   - final_price');
  console.log('   - received_amount');
  console.log('   - sale_notes');
};

exports.down = async function(knex) {
  console.log('🔧 Removing auction sale columns from pawn_items table...');
  
  await knex.schema.table('pawn_items', (table) => {
    table.dropIndex('buyer_id');
    table.dropColumn('buyer_id');
    table.dropColumn('discount_amount');
    table.dropColumn('final_price');
    table.dropColumn('received_amount');
    table.dropColumn('sale_notes');
  });
  
  console.log('✅ Successfully removed auction sale columns');
};
