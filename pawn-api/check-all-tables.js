const { pool } = require('./config/database');

async function checkAllTables() {
  try {
    console.log('🔍 Checking all existing tables...');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 All tables:', tables.rows.map(r => r.table_name));
    
    for (const table of tables.rows) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      console.log(`\n🏷️  ${table.table_name} columns:`, 
        columns.rows.map(c => `${c.column_name}(${c.data_type})`).join(', ')
      );
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllTables();