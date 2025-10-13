const { pool } = require('../config/database');

async function checkTables() {
  try {
    console.log('Checking for description-related tables...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%description%'
      ORDER BY table_name;
    `);
    
    console.log('Tables containing "description":');
    result.rows.forEach(row => console.log(' -', row.table_name));
    
    // Also check for Description with capital D
    const result2 = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name ILIKE '%Description%'
      ORDER BY table_name;
    `);
    
    console.log('\nTables containing "Description" (case-insensitive):');
    result2.rows.forEach(row => console.log(' -', row.table_name));
    
    // Check all tables for reference
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nAll available tables:');
    allTables.rows.forEach(row => console.log(' -', row.table_name));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();