const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function checkRelatedTables() {
  try {
    console.log('=== CHECKING RELATED TABLES ===');
    
    // Check what tables exist that might be related to items/appraisals
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%item%' OR table_name LIKE '%apprais%'
      ORDER BY table_name
    `);
    
    console.log('Related tables:');
    tables.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check pawn_items table structure if it exists
    try {
      const pawnItemsStructure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'pawn_items'
        ORDER BY ordinal_position
      `);
      
      if (pawnItemsStructure.rows.length > 0) {
        console.log('\n=== PAWN_ITEMS TABLE STRUCTURE ===');
        pawnItemsStructure.rows.forEach(col => {
          console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Check if it has data
        const count = await pool.query('SELECT COUNT(*) FROM pawn_items');
        console.log(`\nPawn items count: ${count.rows[0].count}`);
        
        if (parseInt(count.rows[0].count) > 0) {
          const sample = await pool.query('SELECT * FROM pawn_items LIMIT 2');
          console.log('\nSample pawn_items:');
          sample.rows.forEach((row, index) => {
            console.log(`Record ${index + 1}:`, row);
          });
        }
      }
    } catch (err) {
      console.log('\nNo pawn_items table found');
    }
    
    // Check if there's a different table that matches the frontend expectations
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n=== ALL TABLES ===');
    allTables.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

checkRelatedTables();