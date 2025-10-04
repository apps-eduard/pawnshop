const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runComprehensiveMigration() {
  try {
    console.log('🔄 Starting comprehensive database migration...');
    
    // Read and execute the admin_settings.sql file
    console.log('📋 Step 1: Creating all tables from admin_settings.sql...');
    const sqlPath = path.join(__dirname, 'migrations', 'admin_settings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ All tables created from admin_settings.sql');
    
    // Verify tables were created
    console.log('🔍 Verifying created tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log('📋 Available tables:', tables.join(', '));
    
    // Check for audit tables specifically
    const auditTables = tables.filter(name => name.includes('audit'));
    if (auditTables.length > 0) {
      console.log('✅ Audit tables found:', auditTables.join(', '));
    } else {
      console.log('❌ Warning: No audit tables found');
    }
    
    // Check categories
    const categories = await pool.query('SELECT * FROM categories ORDER BY id');
    console.log('📂 Categories:');
    categories.rows.forEach(cat => {
      console.log(`   • ${cat.name}: ${cat.interest_rate}% interest - ${cat.description}`);
    });
    
    await pool.end();
    console.log('🎉 Comprehensive migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await pool.end();
    process.exit(1);
  }
}

runComprehensiveMigration();