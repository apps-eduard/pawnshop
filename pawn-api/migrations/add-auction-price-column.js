const { pool } = require('../config/database');

async function addAuctionPriceColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting migration: Add auction_price column to pawn_items table...\n');
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
        AND column_name = 'auction_price'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Column auction_price already exists in pawn_items table');
      return;
    }
    
    // Add auction_price column
    await client.query(`
      ALTER TABLE pawn_items
      ADD COLUMN auction_price DECIMAL(15,2) DEFAULT NULL
    `);
    
    console.log('✅ Added auction_price column to pawn_items table');
    
    // Add comment to the column
    await client.query(`
      COMMENT ON COLUMN pawn_items.auction_price IS 'Price set by auctioneer for expired items to be auctioned'
    `);
    
    console.log('✅ Added column comment');
    console.log('\n✨ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addAuctionPriceColumn()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addAuctionPriceColumn };
