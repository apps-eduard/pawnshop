const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runComprehensiveMigration() {
  try {
    console.log('🔄 Starting comprehensive database migration...');
    
    // Step 1: Run basic admin settings
    console.log('📋 Step 1: Creating basic tables...');
    const adminSettingsPath = path.join(__dirname, 'migrations', 'admin_settings.sql');
    const adminSQL = fs.readFileSync(adminSettingsPath, 'utf8');
    
    const adminStatements = adminSQL.split(';').filter(stmt => stmt.trim().length > 0);
    for (const statement of adminStatements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    console.log('✅ Basic tables created');
    
    // Step 2: Fix categories table structure
    console.log('🔧 Step 2: Updating categories table...');
    
    // Check if categories table has notes column
    const categoriesColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'notes'
    `);
    
    if (categoriesColumns.rows.length === 0) {
      // Add notes column to categories
      await pool.query(`ALTER TABLE categories ADD COLUMN notes TEXT`);
      console.log('  • Added notes column to categories table');
    }
    
    // Fix category names and add notes
    await pool.query(`
      UPDATE categories 
      SET name = 'Appliances', 
          notes = 'Household appliances including refrigerators, washing machines, air conditioners, and electronics'
      WHERE name = 'Appliance'
    `);
    
    await pool.query(`
      UPDATE categories 
      SET notes = 'Gold, silver, and precious metal items including rings, necklaces, bracelets, and earrings'
      WHERE name = 'Jewelry' AND notes IS NULL
    `);
    
    // Ensure we have the correct categories
    await pool.query(`
      INSERT INTO categories (name, interest_rate, notes) VALUES 
        ('Jewelry', 0.0300, 'Gold, silver, and precious metal items including rings, necklaces, bracelets, and earrings'),
        ('Appliances', 0.0600, 'Household appliances including refrigerators, washing machines, air conditioners, and electronics')
      ON CONFLICT (name) DO UPDATE SET
        interest_rate = EXCLUDED.interest_rate,
        notes = EXCLUDED.notes
    `);
    console.log('✅ Categories table updated');
    
    // Step 3: Create descriptions table
    console.log('📝 Step 3: Creating descriptions table...');
    try {
      // Use psql to run the complex SQL file with dollar-quoted strings
      const { execSync } = require('child_process');
      execSync('psql -h localhost -p 5432 -U postgres -d pawnshop_db -f migrations/create_descriptions_table.sql', {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || 'admin' }
      });
      console.log('✅ Descriptions table created');
    } catch (error) {
      // If psql fails, create basic descriptions table manually
      console.log('⚠️ psql failed, creating basic descriptions table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS descriptions (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL,
          notes TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          UNIQUE(category_id, notes)
        )
      `);
      console.log('✅ Basic descriptions table created');
    }
    
    // Step 4: Create/update cities and barangays tables
    console.log('🏙️ Step 4: Creating cities and barangays tables...');
    
    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('cities', 'barangays')
    `);
    
    const existingTables = tablesCheck.rows.map(t => t.table_name);
    
    if (!existingTables.includes('cities')) {
      // Create cities table
      await pool.query(`
        CREATE TABLE cities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          province VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name)
        )
      `);
      console.log('  • Created cities table');
    } else {
      console.log('  • Cities table already exists');
    }
    
    if (!existingTables.includes('barangays')) {
      // Create barangays table
      await pool.query(`
        CREATE TABLE barangays (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          city_id INTEGER NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
          UNIQUE(name, city_id)
        )
      `);
      console.log('  • Created barangays table');
    } else {
      console.log('  • Barangays table already exists');
    }
    
    // Check and add updated_at columns if missing
    const citiesHasUpdatedAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cities' AND column_name = 'updated_at'
    `);
    
    const barangaysHasUpdatedAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'barangays' AND column_name = 'updated_at'
    `);
    
    if (citiesHasUpdatedAt.rows.length === 0) {
      await pool.query(`ALTER TABLE cities ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      console.log('  • Added updated_at column to cities table');
    }
    
    if (barangaysHasUpdatedAt.rows.length === 0) {
      await pool.query(`ALTER TABLE barangays ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      console.log('  • Added updated_at column to barangays table');
    }
    
    console.log('✅ Cities and barangays tables ready');
    
    // Verify all tables exist
    console.log('🔍 Verifying created tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'descriptions', 'cities', 'barangays', 'loan_rules', 'voucher_types', 'branches')
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check categories
    const categories = await pool.query('SELECT id, name, interest_rate, notes FROM categories ORDER BY name');
    console.log('📂 Categories:');
    categories.rows.forEach(cat => {
      const interestPercent = (cat.interest_rate * 100).toFixed(2);
      console.log(`   • ${cat.name}: ${interestPercent}% interest - ${cat.notes || 'No notes'}`);
    });
    
    console.log('🎉 Comprehensive migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await runComprehensiveMigration();
    process.exit(0);
  } catch (error) {
    console.error('Database migration failed:', error);
    process.exit(1);
  }
}

main();