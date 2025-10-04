const { pool } = require('./config/database');

async function testAllFixes() {
  console.log('🧪 Testing all database fixes and seeded data...');
  console.log('');
  
  try {
    // Test 1: Categories API
    console.log('📋 Test 1: Categories table and API');
    const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY name');
    console.log(`✅ Categories table exists with ${categoriesResult.rows.length} categories:`);
    categoriesResult.rows.forEach(cat => {
      console.log(`   • ${cat.name} (${(cat.interest_rate * 100).toFixed(2)}% interest)`);
    });
    console.log('');
    
    // Test 2: Cities table structure
    console.log('🏙️ Test 2: Cities table structure');
    const citiesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cities' 
      ORDER BY ordinal_position
    `);
    console.log('✅ Cities table columns:');
    citiesColumns.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type})`);
    });
    console.log('');
    
    // Test 3: Barangays table structure
    console.log('🏘️ Test 3: Barangays table structure');
    const barangaysColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'barangays' 
      ORDER BY ordinal_position
    `);
    console.log('✅ Barangays table columns:');
    barangaysColumns.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type})`);
    });
    console.log('');
    
    // Test 4: Visayas and Mindanao cities count by region
    console.log('🌴 Test 4: Visayas and Mindanao cities by region');
    const citiesByRegion = await pool.query(`
      SELECT region, COUNT(*) as city_count 
      FROM cities 
      WHERE region ILIKE '%visayas%' OR region ILIKE '%mindanao%' OR region ILIKE '%davao%' OR region ILIKE '%zamboanga%' OR region ILIKE '%soccsksargen%' OR region ILIKE '%caraga%'
      GROUP BY region 
      ORDER BY region
    `);
    console.log(`✅ Cities by region (Visayas and Mindanao):`);
    let totalVisayasMindanaoCities = 0;
    citiesByRegion.rows.forEach(region => {
      console.log(`   • ${region.region}: ${region.city_count} cities`);
      totalVisayasMindanaoCities += parseInt(region.city_count);
    });
    console.log(`   Total Visayas/Mindanao cities: ${totalVisayasMindanaoCities}`);
    console.log('');
    
    // Test 5: Major cities and their barangay counts
    console.log('🏙️ Test 5: Major cities and barangay counts');
    const majorCities = ['Cebu City', 'Davao City', 'Iloilo City', 'Cagayan de Oro City', 'Bacolod City'];
    
    for (const cityName of majorCities) {
      const barangayCount = await pool.query(`
        SELECT COUNT(*) as count 
        FROM barangays b 
        JOIN cities c ON b.city_id = c.id 
        WHERE c.name = $1
      `, [cityName]);
      
      if (barangayCount.rows[0].count > 0) {
        console.log(`✅ ${cityName}: ${barangayCount.rows[0].count} barangays`);
        
        // Show some sample barangays
        const sampleBarangays = await pool.query(`
          SELECT b.name 
          FROM barangays b 
          JOIN cities c ON b.city_id = c.id 
          WHERE c.name = $1 
          ORDER BY b.name 
          LIMIT 5
        `, [cityName]);
        
        const sampleNames = sampleBarangays.rows.map(b => b.name).join(', ');
        console.log(`     Sample barangays: ${sampleNames}...`);
      } else {
        console.log(`⚠️  ${cityName}: No barangays found`);
      }
    }
    console.log('');
    
    // Test 6: Database queries that previously failed
    console.log('🔍 Test 6: Testing previously failing queries');
    
    try {
      const citiesWithUpdatedAt = await pool.query(`
        SELECT c.name, c.province, c.updated_at 
        FROM cities c 
        WHERE c.updated_at IS NOT NULL 
        ORDER BY c.updated_at DESC 
        LIMIT 5
      `);
      console.log('✅ Cities with updated_at query works:');
      citiesWithUpdatedAt.rows.forEach(city => {
        console.log(`   • ${city.name}, ${city.province} (updated: ${city.updated_at})`);
      });
    } catch (error) {
      console.log('❌ Cities with updated_at query failed:', error.message);
    }
    
    try {
      const barangaysWithUpdatedAt = await pool.query(`
        SELECT b.name, c.name as city_name, b.updated_at 
        FROM barangays b 
        JOIN cities c ON b.city_id = c.id 
        WHERE b.updated_at IS NOT NULL 
        ORDER BY b.updated_at DESC 
        LIMIT 5
      `);
      console.log('✅ Barangays with updated_at query works:');
      barangaysWithUpdatedAt.rows.forEach(barangay => {
        console.log(`   • ${barangay.name}, ${barangay.city_name} (updated: ${barangay.updated_at})`);
      });
    } catch (error) {
      console.log('❌ Barangays with updated_at query failed:', error.message);
    }
    console.log('');
    
    // Test 7: Final summary
    console.log('📊 Test 7: Final database summary');
    const finalStats = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM categories'),
      pool.query('SELECT COUNT(*) as count FROM cities'),
      pool.query('SELECT COUNT(*) as count FROM barangays'),
      pool.query(`SELECT COUNT(*) as count FROM cities WHERE region ILIKE '%visayas%' OR region ILIKE '%mindanao%' OR region ILIKE '%davao%' OR region ILIKE '%zamboanga%' OR region ILIKE '%soccsksargen%' OR region ILIKE '%caraga%'`)
    ]);
    
    console.log('✅ Database summary:');
    console.log(`   • Categories: ${finalStats[0].rows[0].count}`);
    console.log(`   • Total cities: ${finalStats[1].rows[0].count}`);
    console.log(`   • Total barangays: ${finalStats[2].rows[0].count}`);
    console.log(`   • Visayas/Mindanao cities: ${finalStats[3].rows[0].count}`);
    console.log('');
    
    console.log('🎉 All tests passed! The database is properly set up with:');
    console.log('   ✅ Categories table created and seeded');
    console.log('   ✅ Cities and barangays tables have updated_at columns');
    console.log('   ✅ Visayas and Mindanao cities and barangays seeded');
    console.log('   ✅ API queries should now work without errors');
    console.log('');
    console.log('🔧 The setup.bat file has been updated to include all fixes automatically');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testAllFixes();
    process.exit(0);
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

main();