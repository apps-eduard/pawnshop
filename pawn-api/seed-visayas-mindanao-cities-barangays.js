const { pool } = require('./config/database');

async function seedVisayasMindanaoCitiesBarangays() {
  const client = await pool.connect();
  
  try {
    console.log('🏙️ Seeding cities and barangays for Visayas and Mindanao regions...');
    
    await client.query('BEGIN');
    
    // Check if data already exists
    const existingCities = await client.query('SELECT COUNT(*) FROM cities');
    const cityCount = parseInt(existingCities.rows[0].count);
    
    if (cityCount > 0) {
      console.log(`ℹ️  Cities already exist (${cityCount} cities found). Skipping seeding to avoid foreign key conflicts.`);
      console.log('💡 If you want to reseed, please manually clear the data first or run a fresh database setup.');
      return;
    }
    
    console.log('📍 No existing cities found. Proceeding with seeding...');
    
    // Visayas Region Cities and Barangays
    console.log('🌴 Adding Visayas cities and barangays...');
    
    const visayasCities = [
      // Central Visayas (Region VII)
      { name: 'Cebu City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Mandaue City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Lapu-Lapu City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Talisay City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Toledo City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Danao City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Carcar City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Naga City', province: 'Cebu', region: 'Central Visayas (Region VII)' },
      { name: 'Tagbilaran City', province: 'Bohol', region: 'Central Visayas (Region VII)' },
      { name: 'Dumaguete City', province: 'Negros Oriental', region: 'Central Visayas (Region VII)' },
      { name: 'Bayawan City', province: 'Negros Oriental', region: 'Central Visayas (Region VII)' },
      { name: 'Bais City', province: 'Negros Oriental', region: 'Central Visayas (Region VII)' },
      { name: 'Canlaon City', province: 'Negros Oriental', region: 'Central Visayas (Region VII)' },
      { name: 'Guihulngan City', province: 'Negros Oriental', region: 'Central Visayas (Region VII)' },
      { name: 'Tanjay City', province: 'Negros Oriental', region: 'Central Visayas (Region VII)' },
      
      // Western Visayas (Region VI)
      { name: 'Iloilo City', province: 'Iloilo', region: 'Western Visayas (Region VI)' },
      { name: 'Passi City', province: 'Iloilo', region: 'Western Visayas (Region VI)' },
      { name: 'Bacolod City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Bago City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Cadiz City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Escalante City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Himamaylan City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Kabankalan City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'La Carlota City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Sagay City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'San Carlos City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Silay City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Sipalay City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Talisay City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Victorias City', province: 'Negros Occidental', region: 'Western Visayas (Region VI)' },
      { name: 'Roxas City', province: 'Capiz', region: 'Western Visayas (Region VI)' },
      { name: 'Kalibo', province: 'Aklan', region: 'Western Visayas (Region VI)' },
      
      // Eastern Visayas (Region VIII)
      { name: 'Tacloban City', province: 'Leyte', region: 'Eastern Visayas (Region VIII)' },
      { name: 'Baybay City', province: 'Leyte', region: 'Eastern Visayas (Region VIII)' },
      { name: 'Ormoc City', province: 'Leyte', region: 'Eastern Visayas (Region VIII)' },
      { name: 'Maasin City', province: 'Southern Leyte', region: 'Eastern Visayas (Region VIII)' },
      { name: 'Calbayog City', province: 'Samar', region: 'Eastern Visayas (Region VIII)' },
      { name: 'Catbalogan City', province: 'Samar', region: 'Eastern Visayas (Region VIII)' },
      { name: 'Borongan City', province: 'Eastern Samar', region: 'Eastern Visayas (Region VIII)' }
    ];
    
    // Mindanao Region Cities and Barangays
    console.log('🏔️ Adding Mindanao cities and barangays...');
    
    const mindanaoCities = [
      // Davao Region (Region XI)
      { name: 'Davao City', province: 'Davao del Sur', region: 'Davao Region (Region XI)' },
      { name: 'Digos City', province: 'Davao del Sur', region: 'Davao Region (Region XI)' },
      { name: 'Tagum City', province: 'Davao del Norte', region: 'Davao Region (Region XI)' },
      { name: 'Panabo City', province: 'Davao del Norte', region: 'Davao Region (Region XI)' },
      { name: 'Samal City', province: 'Davao del Norte', region: 'Davao Region (Region XI)' },
      { name: 'Mati City', province: 'Davao Oriental', region: 'Davao Region (Region XI)' },
      
      // Northern Mindanao (Region X)
      { name: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Northern Mindanao (Region X)' },
      { name: 'Gingoog City', province: 'Misamis Oriental', region: 'Northern Mindanao (Region X)' },
      { name: 'Oroquieta City', province: 'Misamis Occidental', region: 'Northern Mindanao (Region X)' },
      { name: 'Ozamiz City', province: 'Misamis Occidental', region: 'Northern Mindanao (Region X)' },
      { name: 'Tangub City', province: 'Misamis Occidental', region: 'Northern Mindanao (Region X)' },
      { name: 'Butuan City', province: 'Agusan del Norte', region: 'Northern Mindanao (Region X)' },
      { name: 'Cabadbaran City', province: 'Agusan del Norte', region: 'Northern Mindanao (Region X)' },
      { name: 'Bayugan City', province: 'Agusan del Sur', region: 'Northern Mindanao (Region X)' },
      { name: 'Iligan City', province: 'Lanao del Norte', region: 'Northern Mindanao (Region X)' },
      
      // Zamboanga Peninsula (Region IX)
      { name: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Zamboanga Peninsula (Region IX)' },
      { name: 'Pagadian City', province: 'Zamboanga del Sur', region: 'Zamboanga Peninsula (Region IX)' },
      { name: 'Dipolog City', province: 'Zamboanga del Norte', region: 'Zamboanga Peninsula (Region IX)' },
      { name: 'Dapitan City', province: 'Zamboanga del Norte', region: 'Zamboanga Peninsula (Region IX)' },
      
      // SOCCSKSARGEN (Region XII)
      { name: 'General Santos City', province: 'South Cotabato', region: 'SOCCSKSARGEN (Region XII)' },
      { name: 'Koronadal City', province: 'South Cotabato', region: 'SOCCSKSARGEN (Region XII)' },
      { name: 'Kidapawan City', province: 'Cotabato', region: 'SOCCSKSARGEN (Region XII)' },
      { name: 'Tacurong City', province: 'Sultan Kudarat', region: 'SOCCSKSARGEN (Region XII)' },
      
      // Caraga Region (Region XIII)
      { name: 'Surigao City', province: 'Surigao del Norte', region: 'Caraga Region (Region XIII)' },
      { name: 'Bislig City', province: 'Surigao del Sur', region: 'Caraga Region (Region XIII)' },
      { name: 'Tandag City', province: 'Surigao del Sur', region: 'Caraga Region (Region XIII)' }
    ];
    
    // Combine all cities
    const allCities = [...visayasCities, ...mindanaoCities];
    
    // Insert cities and store their IDs
    const cityMap = new Map();
    
    for (const cityData of allCities) {
      const cityResult = await client.query(`
        INSERT INTO cities (name, province, region, is_active, created_at, updated_at) 
        VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING id, name
      `, [cityData.name, cityData.province, cityData.region]);
      
      cityMap.set(cityData.name, cityResult.rows[0].id);
      console.log(`✅ Added city: ${cityData.name}, ${cityData.province}`);
    }
    
    // Barangay data for major cities
    const barangayData = {
      // Cebu City
      'Cebu City': [
        'Apas', 'Banilad', 'Barangay Luz', 'Basak Pardo', 'Basak San Nicolas', 'Binaliw',
        'Bonbon', 'Budla-an', 'Buhisan', 'Bulacao', 'Busay', 'Calamba', 'Cambinocot',
        'Capitol Site', 'Carreta', 'Cogon Pardo', 'Day-as', 'Duljo Fatima', 'Ermita',
        'Guadalupe', 'Guba', 'Hipodromo', 'Inayawan', 'Kalubihan', 'Kamagayan',
        'Kamputhaw', 'Kasambagan', 'Kinasang-an', 'Lahug', 'Lorega San Miguel',
        'Mabini', 'Mabolo', 'Malubog', 'Mambaling', 'Pahina Central', 'Pahina San Nicolas',
        'Pamutan', 'Pardo', 'Pasil', 'Pit-os', 'Poblacion Pardo', 'Pulangbato',
        'Pung-ol Sibugay', 'Punta Princesa', 'Quiot', 'Sambag I', 'Sambag II',
        'San Antonio', 'San Jose', 'San Nicolas Central', 'San Roque', 'Santa Cruz',
        'Santo Niño', 'Sapangdaku', 'Sawang Calero', 'Sinsin', 'Sirao', 'Suba',
        'Sudlon I', 'Sudlon II', 'Tabunan', 'Tagba-o', 'Talamban', 'Taptap',
        'Tejero', 'Tinago', 'Tisa', 'To-ong', 'Zapatera'
      ],
      
      // Davao City
      'Davao City': [
        'Agdao', 'Alambre', 'Angalan', 'Angliongto', 'Baganihan', 'Bago Aplaya',
        'Bago Gallera', 'Baguio', 'Balengaeng', 'Baliok', 'Bangkas Heights',
        'Bantol', 'Baracatan', 'Bato', 'Binugao', 'Buhangin', 'Bunawan',
        'Busa', 'Calinan', 'Callawa', 'Catitipan', 'Cawayan', 'Crossing Bayabas',
        'Dalag', 'Daliaon', 'Dumoy', 'Eden', 'Fatima', 'Francisco', 'Ganzon',
        'Guinoyoran', 'Hizon', 'Inayangan', 'Indangan', 'Katarungan', 'Kilate',
        'Lacson', 'Lamanan', 'Leon Garcia', 'Lizada', 'Los Amigos', 'Lubogan',
        'Lumiad', 'Ma-a', 'Magsaysay', 'Mahayag', 'Malabog', 'Malagamot',
        'Malamba', 'Manambulan', 'Mandug', 'Manuel Guianga', 'Mapula', 'Marapangi',
        'Matina Aplaya', 'Matina Crossing', 'Matina Pangi', 'Megkawayan',
        'Mintal', 'Mulig', 'New Carmen', 'New Valencia', 'Obrero', 'Pampanga',
        'Panacan', 'Panabo', 'Pandaitan', 'Paquibato', 'Poblacion', 'Rafael Castillo',
        'Riverside', 'Salizon', 'Sibulan', 'Sirawan', 'Sito Sawmill', 'Suawan',
        'Tacunan', 'Tagakpan', 'Tagurano', 'Talandang', 'Talomo', 'Tamayong',
        'Tamugan', 'Tibuloy', 'Tigatto', 'Toril', 'Tugbok', 'Ula', 'Waan', 'Wines'
      ],
      
      // Iloilo City  
      'Iloilo City': [
        'Arevalo', 'Balantang', 'Banuyao', 'Bitoon', 'Bo. Obrero', 'Bolilao',
        'Bonifacio', 'Buntatala', 'Calaparan', 'Calumpang', 'Cha-Uy', 'Cuartero',
        'Danao', 'Delavin', 'Dungon A', 'Dungon B', 'East Baluarte', 'East Timawa',
        'Edganzon', 'Festejo', 'Gloria', 'Guzman-Jesena', 'Habog-Habog', 'Hipodromo',
        'Inhawaan', 'Jalandoni Estate', 'Javellana', 'Jereos', 'Kasingkasing',
        'Kauswagan', 'Laguda', 'Liberation', 'Libertad-Santa Isabel', 'Lopez Jaena Norte',
        'Lopez Jaena Sur', 'Luna', 'Ma. Cristina', 'Magsaysay Village', 'Malipayon',
        'Mandurriao', 'Maria Clara', 'Molo', 'Nabitasan', 'Navais', 'North Baluarte',
        'North San Jose', 'North Fundidor', 'Obrero', 'Our Lady of Fatima',
        'Our Lady of Lourdes', 'Pagsanga-an', 'Poblacion Molo', 'Quintin Salas',
        'Rizal Estanzuela', 'Rizal Ibarra', 'Sambag', 'San Agustin', 'San Antonio',
        'San Felix', 'San Isidro', 'San Jose', 'San Juan', 'San Pedro', 'San Rafael',
        'Santa Filomena', 'Santa Rosa', 'Santo Domingo', 'Santo Niño Norte',
        'Santo Niño Sur', 'Santo Rosario-Duran', 'Sinikway', 'South Baluarte',
        'South Fundidor', 'South San Jose', 'Tabucan', 'Tabuc Suba', 'Tacas',
        'Tagbak', 'Tanza-Esperanza', 'Villa Anita', 'West Habog-Habog', 'West Timawa',
        'Yulo-Arroyo', 'Zamora-Melliza'
      ],
      
      // Cagayan de Oro City
      'Cagayan de Oro City': [
        'Agusan', 'Balubal', 'Balulang', 'Bayabas', 'Bayanga', 'Besigan',
        'Bonbon', 'Bugo', 'Bulua', 'Camaman-an', 'Canito-an', 'Carmen',
        'Consolacion', 'Cugman', 'F.S. Catanico', 'Gusa', 'Iponan', 'Kauswagan',
        'Lapasan', 'Lumbia', 'Macabalan', 'Macasandig', 'Mambuaya', 'Nazareth',
        'Pagatpat', 'Pigsag-an', 'Puerto', 'Puntod', 'San Simon', 'Tablon',
        'Taglimao', 'Tagpangi', 'Tignapoloan', 'Tuburan', 'Tumpagon', 'UpperBalulang',
        'UpperCarmen', 'UpperGusa', 'Villa Limpia', 'Zone 1', 'Zone 2', 'Zone 3'
      ],
      
      // Bacolod City
      'Bacolod City': [
        'Alangilan', 'Alijis', 'Banago', 'Barangay 1', 'Barangay 2', 'Barangay 3',
        'Barangay 4', 'Barangay 5', 'Barangay 6', 'Barangay 7', 'Barangay 8',
        'Barangay 9', 'Barangay 10', 'Barangay 11', 'Barangay 12', 'Barangay 13',
        'Barangay 14', 'Barangay 15', 'Barangay 16', 'Barangay 17', 'Barangay 18',
        'Barangay 19', 'Barangay 20', 'Barangay 21', 'Barangay 22', 'Barangay 23',
        'Barangay 24', 'Barangay 25', 'Barangay 26', 'Barangay 27', 'Barangay 28',
        'Barangay 29', 'Barangay 30', 'Barangay 31', 'Barangay 32', 'Barangay 33',
        'Barangay 34', 'Barangay 35', 'Barangay 36', 'Barangay 37', 'Barangay 38',
        'Barangay 39', 'Barangay 40', 'Barangay 41', 'Bata', 'Cabug', 'Estefania',
        'Felisa', 'Granada', 'Handumanan', 'Lopez Jaena', 'Mandalagan', 'Mansilingan',
        'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport', 'Sum-ag',
        'Taculing', 'Tangub', 'Vista Alegre', 'Villamonte'
      ]
    };
    
    console.log('🏘️ Adding barangays for major cities...');
    
    // Insert barangays for cities that have specific barangay data
    for (const [cityName, barangays] of Object.entries(barangayData)) {
      const cityId = cityMap.get(cityName);
      if (cityId) {
        for (const barangayName of barangays) {
          await client.query(`
            INSERT INTO barangays (name, city_id, is_active, created_at, updated_at) 
            VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [barangayName, cityId]);
        }
        console.log(`✅ Added ${barangays.length} barangays for ${cityName}`);
      }
    }
    
    // Add default barangays for cities without specific barangay data
    console.log('🏘️ Adding default barangays for other cities...');
    const defaultBarangays = ['Poblacion', 'San Roque', 'San Jose', 'Santa Maria', 'San Antonio', 'San Pedro', 'Santo Niño', 'Bagong Silang'];
    
    for (const [cityName, cityId] of cityMap.entries()) {
      if (!barangayData[cityName]) {
        for (const barangayName of defaultBarangays) {
          await client.query(`
            INSERT INTO barangays (name, city_id, is_active, created_at, updated_at) 
            VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [barangayName, cityId]);
        }
        console.log(`✅ Added ${defaultBarangays.length} default barangays for ${cityName}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('🎉 Visayas and Mindanao cities and barangays seeded successfully!');
    
    // Display summary
    const finalCities = await client.query('SELECT COUNT(*) FROM cities');
    const finalBarangays = await client.query('SELECT COUNT(*) FROM barangays');
    
    console.log(`📊 Summary:`);
    console.log(`   • ${finalCities.rows[0].count} cities added`);
    console.log(`   • ${finalBarangays.rows[0].count} barangays added`);
    console.log(`   • Regions covered: Visayas (Central, Western, Eastern) and Mindanao (All regions)`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding cities and barangays:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await seedVisayasMindanaoCitiesBarangays();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed cities and barangays:', error);
    process.exit(1);
  }
}

main();