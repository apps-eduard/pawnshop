const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runComprehensiveMigration() {
  try {
    console.log('🔄 Starting comprehensive database migration...');
    
    // Step 1: Create admin and basic tables
    console.log('📋 Step 1: Creating admin tables from admin_settings.sql...');
    const adminSqlPath = path.join(__dirname, 'migrations', 'admin_settings.sql');
    const adminSql = fs.readFileSync(adminSqlPath, 'utf8');
    await pool.query(adminSql);
    console.log('✅ Admin tables created from admin_settings.sql');
    
    // Step 2: Create core pawn shop business tables
    console.log('📋 Step 2: Creating core pawn shop tables...');
    const coreSqlPath = path.join(__dirname, 'migrations', 'pawn_shop_core_tables.sql');
    const coreSql = fs.readFileSync(coreSqlPath, 'utf8');
    await pool.query(coreSql);
    console.log('✅ Core pawn shop tables created');
    
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
    
    console.log('🎉 Comprehensive migration completed successfully!');
    
    // Show all created tables
    const showAllTables = require('./verify-all-tables');
    await showAllTables();
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await pool.end();
    process.exit(1);
  }
}

runComprehensiveMigration();