const { pool } = require('./config/database');

async function testFreshSetupWorkflow() {
  console.log('🧪 Testing fresh setup workflow (simulating setup.bat database steps)...');
  console.log('');
  
  try {
    // Step 1: Test comprehensive migration
    console.log('🔄 Step 1: Testing comprehensive migration...');
    const { exec } = require('child_process');
    
    // Run comprehensive migration
    await new Promise((resolve, reject) => {
      exec('node run-comprehensive-migration.js', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Migration failed:', error);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });
    
    // Step 2: Test cities and barangays seeding
    console.log('🏙️ Step 2: Testing cities and barangays seeding...');
    await new Promise((resolve, reject) => {
      exec('node add-visayas-mindanao-cities.js', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Cities seeding failed:', error);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });
    
    // Step 3: Test descriptions seeding
    console.log('💎 Step 3: Testing descriptions seeding...');
    await new Promise((resolve, reject) => {
      exec('node seed-item-descriptions.js', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Descriptions seeding failed:', error);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });
    
    // Step 4: Verify everything is properly seeded
    console.log('✅ Step 4: Verifying final database state...');
    
    // Check categories
    const categories = await pool.query('SELECT id, name, interest_rate, notes FROM categories ORDER BY name');
    console.log('📂 Categories:');
    categories.rows.forEach(cat => {
      const interestPercent = (cat.interest_rate * 100).toFixed(2);
      console.log(`   • ${cat.name}: ${interestPercent}% interest - ${cat.notes}`);
    });
    
    // Check cities count
    const citiesCount = await pool.query('SELECT COUNT(*) as count FROM cities');
    const barangaysCount = await pool.query('SELECT COUNT(*) as count FROM barangays');
    console.log(`🏙️ Geographic data: ${citiesCount.rows[0].count} cities, ${barangaysCount.rows[0].count} barangays`);
    
    // Check descriptions count
    const descriptionsCount = await pool.query(`
      SELECT c.name as category, COUNT(d.id) as count
      FROM categories c
      LEFT JOIN descriptions d ON c.id = d.category_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    console.log('💎 Descriptions:');
    descriptionsCount.rows.forEach(cat => {
      console.log(`   • ${cat.category}: ${cat.count} selectable options`);
    });
    
    // Test API-ready queries
    console.log('');
    console.log('🔧 Testing API-ready queries...');
    
    // Test category selection
    const categoryOptions = await pool.query(`
      SELECT id, name, interest_rate
      FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);
    
    console.log('✅ Category dropdown data:');
    categoryOptions.rows.forEach(cat => {
      const interestPercent = (cat.interest_rate * 100).toFixed(2);
      console.log(`   • {id: ${cat.id}, name: "${cat.name}", interest: "${interestPercent}%"}`);
    });
    
    // Test description selection for jewelry
    const jewelryDescriptions = await pool.query(`
      SELECT d.id, d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      WHERE c.name = 'Jewelry' AND d.is_active = true
      ORDER BY d.notes
      LIMIT 5
    `);
    
    console.log('✅ Jewelry description options (sample):');
    jewelryDescriptions.rows.forEach(desc => {
      console.log(`   • {id: ${desc.id}, description: "${desc.notes}"}`);
    });
    
    // Test description selection for appliances
    const applianceDescriptions = await pool.query(`
      SELECT d.id, d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      WHERE c.name = 'Appliances' AND d.is_active = true
      ORDER BY d.notes
      LIMIT 5
    `);
    
    console.log('✅ Appliance description options (sample):');
    applianceDescriptions.rows.forEach(desc => {
      console.log(`   • {id: ${desc.id}, description: "${desc.notes}"}`);
    });
    
    console.log('');
    console.log('🎉 Fresh setup workflow test completed successfully!');
    console.log('');
    console.log('✅ **Summary of what setup.bat will now do:**');
    console.log('   1. 🔧 Run comprehensive migration (creates all tables with proper structure)');
    console.log('   2. 🏙️ Seed Visayas/Mindanao cities and barangays');
    console.log('   3. 💎 Seed 200 selectable item descriptions');
    console.log('   4. 📊 Provide counts and verification');
    console.log('');
    console.log('✅ **Users will have access to:**');
    console.log(`   • ${categories.rows.length} categories with proper interest rates`);
    console.log(`   • ${citiesCount.rows[0].count} cities and ${barangaysCount.rows[0].count} barangays`);
    console.log(`   • ${descriptionsCount.rows.map(c => c.count).reduce((a, b) => parseInt(a) + parseInt(b), 0)} selectable item descriptions`);
    console.log('   • Full API integration ready');
    
  } catch (error) {
    console.error('❌ Fresh setup workflow test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testFreshSetupWorkflow();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();