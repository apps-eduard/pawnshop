const { pool } = require('./config/database');

async function addNewSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Adding new sample cities and barangays...\n');
    
    await client.query('BEGIN');
    
    // Define new cities and their barangays (Philippine data)
    const newCitiesData = [
      {
        name: 'Iloilo City',
        province: 'Iloilo',
        barangays: ['Molo', 'Jaro', 'La Paz', 'Mandurriao', 'Arevalo', 'City Proper']
      },
      {
        name: 'Baguio City',
        province: 'Benguet',
        barangays: ['Session Road', 'Burnham Park', 'Camp Allen', 'Aurora Hill', 'Malcolm Square']
      },
      {
        name: 'Cagayan de Oro',
        province: 'Misamis Oriental',
        barangays: ['Carmen', 'Lapasan', 'Nazareth', 'Gusa', 'Macasandig']
      },
      {
        name: 'Zamboanga City',
        province: 'Zamboanga del Sur',
        barangays: ['Tetuan', 'Tumaga', 'Putik', 'Baliwasan', 'La Paz']
      },
      {
        name: 'Bacolod City',
        province: 'Negros Occidental',
        barangays: ['Villamonte', 'Taculing', 'Mandalagan', 'Bata', 'Singcang-Airport']
      },
      {
        name: 'General Santos',
        province: 'South Cotabato',
        barangays: ['Dadiangas North', 'Fatima', 'Lagao', 'City Heights', 'Olympog']
      },
      {
        name: 'Antipolo City',
        province: 'Rizal',
        barangays: ['San Roque', 'Bagong Nayon', 'Dalig', 'San Jose', 'Cupang']
      },
      {
        name: 'Parañaque City',
        province: 'Metro Manila',
        barangays: ['Baclaran', 'Tambo', 'San Dionisio', 'La Huerta', 'San Martin de Porres']
      }
    ];
    
    console.log('=== ADDING NEW CITIES ===');
    
    for (const cityData of newCitiesData) {
      // Check if city already exists
      const existingCity = await client.query(
        'SELECT id FROM cities WHERE LOWER(name) = LOWER($1)',
        [cityData.name]
      );
      
      let cityId;
      
      if (existingCity.rows.length > 0) {
        cityId = existingCity.rows[0].id;
        console.log(`ℹ️  City "${cityData.name}" already exists (ID: ${cityId})`);
      } else {
        // Insert new city
        const cityResult = await client.query(`
          INSERT INTO cities (name, province, is_active) 
          VALUES ($1, $2, true) 
          RETURNING id
        `, [cityData.name, cityData.province]);
        
        cityId = cityResult.rows[0].id;
        console.log(`✅ Added city: ${cityData.name}, ${cityData.province} (ID: ${cityId})`);
      }
      
      // Add barangays for this city
      console.log(`   Adding barangays for ${cityData.name}:`);
      
      for (const barangayName of cityData.barangays) {
        // Check if barangay already exists in this city
        const existingBarangay = await client.query(
          'SELECT id FROM barangays WHERE LOWER(name) = LOWER($1) AND city_id = $2',
          [barangayName, cityId]
        );
        
        if (existingBarangay.rows.length > 0) {
          console.log(`   ℹ️  Barangay "${barangayName}" already exists in ${cityData.name}`);
        } else {
          await client.query(`
            INSERT INTO barangays (name, city_id, is_active) 
            VALUES ($1, $2, true)
          `, [barangayName, cityId]);
          
          console.log(`   ✅ Added barangay: ${barangayName}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    await client.query('COMMIT');
    
    // Show final counts
    console.log('=== FINAL SUMMARY ===');
    const finalCities = await client.query('SELECT COUNT(*) FROM cities WHERE is_active = true');
    const finalBarangays = await client.query('SELECT COUNT(*) FROM barangays WHERE is_active = true');
    
    console.log(`Total active cities: ${finalCities.rows[0].count}`);
    console.log(`Total active barangays: ${finalBarangays.rows[0].count}`);
    
    // Show all cities with barangay counts
    const citiesWithCounts = await client.query(`
      SELECT c.name, c.province, COUNT(b.id) as barangay_count
      FROM cities c
      LEFT JOIN barangays b ON c.id = b.city_id AND b.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.province
      ORDER BY c.name
    `);
    
    console.log('\n📍 Cities and their barangay counts:');
    citiesWithCounts.rows.forEach(row => {
      console.log(`   ${row.name}, ${row.province}: ${row.barangay_count} barangays`);
    });
    
    console.log('\n🎉 New sample data added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding new sample data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  addNewSampleData()
    .then(() => {
      console.log('🏁 Sample data process completed');
      pool.end();
    })
    .catch((error) => {
      console.error('💥 Sample data process failed:', error);
      pool.end();
      process.exit(1);
    });
}