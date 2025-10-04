const { pool } = require('./config/database');

async function checkPawnItemsStructure() {
  try {
    console.log('🔍 Checking pawn_items table structure...');
    
    // Check if pawn_items table exists
    const tableExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'pawn_items'
    `);
    
    if (tableExists.rows.length === 0) {
      console.log('❌ pawn_items table does not exist');
      
      // Check for similar table names
      const similarTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name ILIKE '%item%' OR table_name ILIKE '%pawn%'
        ORDER BY table_name
      `);
      
      console.log('🔍 Similar table names found:');
      similarTables.rows.forEach(table => {
        console.log(`   • ${table.table_name}`);
      });
      
      return;
    }
    
    // Get table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Pawn Items table structure:');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'nullable' : 'not null';
      const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
      console.log(`   • ${col.column_name}: ${col.data_type} - ${nullable}${defaultVal}`);
    });
    
    // Check existing data
    const existingData = await pool.query('SELECT COUNT(*) as count FROM pawn_items');
    console.log(`📊 Existing pawn items: ${existingData.rows[0].count}`);
    
    // Check categories to reference
    const categories = await pool.query('SELECT id, name FROM categories ORDER BY name');
    console.log('📋 Available categories:');
    categories.rows.forEach(cat => {
      console.log(`   • ID ${cat.id}: ${cat.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking pawn_items structure:', error.message);
  }
}

async function main() {
  try {
    await checkPawnItemsStructure();
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

main();