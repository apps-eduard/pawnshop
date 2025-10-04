const { pool } = require('./config/database');
const { spawn } = require('child_process');
const fs = require('fs');

async function testFreshSetup() {
  try {
    console.log('🧪 Testing fresh setup.bat workflow...\n');
    
    // Step 1: Create database
    console.log('📋 Step 1: Creating database...');
    try {
      const { execSync } = require('child_process');
      execSync('node create-database.js', { stdio: 'inherit' });
      console.log('✅ Database created successfully\n');
    } catch (error) {
      console.error('❌ Database creation failed:', error.message);
      return false;
    }

    // Step 2: Test database connection
    console.log('📋 Step 2: Testing database connection...');
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection successful\n');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    // Step 3: Run comprehensive migration
    console.log('📋 Step 3: Running comprehensive migration...');
    try {
      const { execSync } = require('child_process');
      execSync('node run-comprehensive-migration.js', { stdio: 'inherit' });
      console.log('✅ Comprehensive migration completed\n');
    } catch (error) {
      console.error('❌ Comprehensive migration failed:', error.message);
      console.log('💡 Trying fallback basic migration...');
      try {
        execSync('node run-migration.js', { stdio: 'inherit' });
        console.log('✅ Basic migration completed\n');
      } catch (fallbackError) {
        console.error('❌ Basic migration also failed:', fallbackError.message);
        return false;
      }
    }

    // Step 4: Check tables created
    console.log('📋 Step 4: Verifying tables created...');
    try {
      const client = await pool.connect();
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log('✅ Tables created:');
      tables.rows.forEach(table => {
        console.log(`   • ${table.table_name}`);
      });
      console.log('');
      
      const requiredTables = ['categories', 'cities', 'barangays'];
      const existingTables = tables.rows.map(t => t.table_name);
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length > 0) {
        console.log('⚠️ Missing required tables:', missingTables.join(', '));
        
        // Create missing tables
        if (missingTables.includes('cities') || missingTables.includes('barangays')) {
          console.log('🔧 Creating address tables...');
          execSync('node create-address-tables.js', { stdio: 'inherit' });
        }
      }
      
      client.release();
    } catch (error) {
      console.error('❌ Table verification failed:', error.message);
      return false;
    }

    // Step 5: Seed cities and barangays
    console.log('📋 Step 5: Seeding Visayas and Mindanao cities...');
    try {
      const { execSync } = require('child_process');
      execSync('node add-visayas-mindanao-cities.js', { stdio: 'inherit' });
      console.log('✅ Cities and barangays seeded successfully\n');
    } catch (error) {
      console.error('❌ Cities seeding failed:', error.message);
      return false;
    }

    // Step 6: Create descriptions table if needed
    console.log('📋 Step 6: Ensuring descriptions table exists...');
    try {
      const client = await pool.connect();
      const descTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'descriptions'
      `);
      
      if (descTable.rows.length === 0) {
        console.log('🔧 Creating descriptions table...');
        const { execSync } = require('child_process');
        execSync('psql -h localhost -p 5432 -U postgres -d pawnshop_db -f migrations/create_descriptions_table.sql', 
                { stdio: 'inherit' });
      } else {
        console.log('✅ Descriptions table already exists');
      }
      
      client.release();
      console.log('');
    } catch (error) {
      console.error('❌ Descriptions table check failed:', error.message);
      return false;
    }

    // Step 7: Seed descriptions
    console.log('📋 Step 7: Seeding jewelry and appliance descriptions...');
    try {
      const { execSync } = require('child_process');
      execSync('node seed-item-descriptions.js', { stdio: 'inherit' });
      console.log('✅ Item descriptions seeded successfully\n');
    } catch (error) {
      console.error('❌ Descriptions seeding failed:', error.message);
      return false;
    }

    // Step 8: Final verification
    console.log('📋 Step 8: Final verification...');
    try {
      const client = await pool.connect();
      
      // Check categories
      const categories = await client.query('SELECT name, COUNT(*) as count FROM categories GROUP BY name ORDER BY name');
      console.log('📂 Categories:');
      categories.rows.forEach(cat => {
        console.log(`   • ${cat.name}: ${cat.count} record(s)`);
      });
      
      // Check cities and barangays
      const citiesCount = await client.query('SELECT COUNT(*) FROM cities');
      const barangaysCount = await client.query('SELECT COUNT(*) FROM barangays');
      console.log(`🏙️ Cities: ${citiesCount.rows[0].count}`);
      console.log(`🏘️ Barangays: ${barangaysCount.rows[0].count}`);
      
      // Check descriptions
      const descriptionsCount = await client.query(`
        SELECT c.name, COUNT(d.id) as description_count 
        FROM categories c 
        LEFT JOIN descriptions d ON c.id = d.category_id 
        GROUP BY c.name 
        ORDER BY c.name
      `);
      console.log('📝 Descriptions by category:');
      descriptionsCount.rows.forEach(desc => {
        console.log(`   • ${desc.name}: ${desc.description_count} descriptions`);
      });
      
      client.release();
      console.log('\n🎉 Fresh setup test completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Final verification failed:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function main() {
  try {
    const success = await testFreshSetup();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();