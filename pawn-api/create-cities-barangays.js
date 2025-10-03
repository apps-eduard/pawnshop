const { pool } = require('./config/database');

async function createCitiesAndBarangays() {
  const client = await pool.connect();
  
  try {
    console.log('🏙️ Creating cities and barangays...');
    
    await client.query('BEGIN');
    
    // Check if cities already exist
    const existingCities = await client.query('SELECT COUNT(*) FROM cities');
    const cityCount = parseInt(existingCities.rows[0].count);
    
    if (cityCount === 0) {
      console.log('📍 Adding Philippine cities...');
      
      // Major Philippine cities
      const cities = [
        'Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong',
        'San Juan', 'Pasay', 'Parañaque', 'Las Piñas', 'Muntinlupa', 'Marikina',
        'Caloocan', 'Malabon', 'Navotas', 'Valenzuela', 'Antipolo', 'Cainta',
        'Taytay', 'Angono', 'Binangonan', 'Cardona', 'Jalajala', 'Morong',
        'Pililla', 'Rodriguez', 'San Mateo', 'Tanay', 'Teresa', 'Baras',
        'Cebu City', 'Davao City', 'Zamboanga City', 'Cagayan de Oro', 'Iloilo City'
      ];
      
      const cityInserts = [];
      for (const cityName of cities) {
        const cityResult = await client.query(`
          INSERT INTO cities (name, is_active) VALUES ($1, true) RETURNING id, name
        `, [cityName]);
        cityInserts.push(cityResult.rows[0]);
        
        console.log(`✅ Added city: ${cityName}`);
      }
      
      console.log('🏘️ Adding sample barangays...');
      
      // Sample barangays for major cities
      const barangayData = {
        'Manila': [
          'Ermita', 'Malate', 'Binondo', 'Quiapo', 'San Nicolas', 'Santa Cruz',
          'Sampaloc', 'San Miguel', 'Intramuros', 'Port Area', 'Pandacan', 'Paco'
        ],
        'Quezon City': [
          'Diliman', 'Cubao', 'Commonwealth', 'Fairview', 'Novaliches', 'La Mesa',
          'Bago Bantay', 'Bagong Pag-asa', 'Central', 'Kamuning', 'Sacred Heart', 'Teachers Village'
        ],
        'Makati': [
          'Poblacion', 'Legazpi Village', 'Salcedo Village', 'Bel-Air', 'San Lorenzo',
          'Urdaneta', 'Valenzuela', 'Forbes Park', 'Dasmariñas', 'Magallanes', 'San Antonio', 'Singkamas'
        ],
        'Pasig': [
          'Bagong Ilog', 'Bagong Katipunan', 'Bambang', 'Buting', 'Caniogan', 'Dela Paz',
          'Kalawaan', 'Kapasigan', 'Kapitolyo', 'Malinao', 'Manggahan', 'Maybunga'
        ],
        'Taguig': [
          'Fort Bonifacio', 'Western Bicutan', 'Central Bicutan', 'South Signal Village',
          'North Signal Village', 'Bagumbayan', 'Bambang', 'Calzada', 'Hagonoy', 'Ibayo-Tipas'
        ]
      };
      
      for (const city of cityInserts) {
        const barangays = barangayData[city.name] || ['Poblacion', 'San Roque', 'San Jose', 'Santa Maria'];
        
        for (const barangayName of barangays) {
          await client.query(`
            INSERT INTO barangays (name, city_id, is_active) VALUES ($1, $2, true)
          `, [barangayName, city.id]);
        }
        
        console.log(`✅ Added ${barangays.length} barangays for ${city.name}`);
      }
      
    } else {
      console.log(`ℹ️  Cities already exist (${cityCount} cities found)`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 Cities and barangays setup completed!');
    
    // Display summary
    const finalCities = await client.query('SELECT COUNT(*) FROM cities');
    const finalBarangays = await client.query('SELECT COUNT(*) FROM barangays');
    
    console.log(`📊 Summary: ${finalCities.rows[0].count} cities, ${finalBarangays.rows[0].count} barangays`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating cities and barangays:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createCitiesAndBarangays();
    process.exit(0);
  } catch (error) {
    console.error('Failed to create cities and barangays:', error);
    process.exit(1);
  }
}

main();