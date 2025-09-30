const { pool } = require('./config/database');

async function checkTables() {
  try {
    console.log('🔍 Checking existing table structures...');
    
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'loan_rules', 'voucher_types', 'branches')
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check branches table structure if it exists
    if (tables.rows.some(r => r.table_name === 'branches')) {
      const branchColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
        ORDER BY ordinal_position
      `);
      
      console.log('🏢 Branches table columns:', branchColumns.rows);
    }
    
    // Check categories table structure if it exists
    if (tables.rows.some(r => r.table_name === 'categories')) {
      const categoryColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
        ORDER BY ordinal_position
      `);
      
      console.log('📂 Categories table columns:', categoryColumns.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();