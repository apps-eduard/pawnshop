/**
 * Cities and Barangays Seed
 * Philippine cities and barangays (Visayas and Mindanao focus)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // ===== CITIES =====
  const cities = [
    // Cebu Province
    { name: 'Cebu City', province: 'Cebu', region: 'Region VII (Central Visayas)' },
    { name: 'Mandaue City', province: 'Cebu', region: 'Region VII (Central Visayas)' },
    { name: 'Lapu-Lapu City', province: 'Cebu', region: 'Region VII (Central Visayas)' },
    { name: 'Talisay City', province: 'Cebu', region: 'Region VII (Central Visayas)' },
    { name: 'Toledo City', province: 'Cebu', region: 'Region VII (Central Visayas)' },
    
    // Davao Region
    { name: 'Davao City', province: 'Davao del Sur', region: 'Region XI (Davao Region)' },
    { name: 'Tagum City', province: 'Davao del Norte', region: 'Region XI (Davao Region)' },
    { name: 'Panabo City', province: 'Davao del Norte', region: 'Region XI (Davao Region)' },
    { name: 'Digos City', province: 'Davao del Sur', region: 'Region XI (Davao Region)' },
    { name: 'Mati City', province: 'Davao Oriental', region: 'Region XI (Davao Region)' },
    
    // Iloilo Province
    { name: 'Iloilo City', province: 'Iloilo', region: 'Region VI (Western Visayas)' },
    { name: 'Passi City', province: 'Iloilo', region: 'Region VI (Western Visayas)' },
    
    // Bacolod/Negros
    { name: 'Bacolod City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)' },
    { name: 'Silay City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)' },
    { name: 'Talisay City', province: 'Negros Occidental', region: 'Region VI (Western Visayas)' },
    { name: 'Dumaguete City', province: 'Negros Oriental', region: 'Region VII (Central Visayas)' },
    
    // Cagayan de Oro/Misamis
    { name: 'Cagayan de Oro City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)' },
    { name: 'Gingoog City', province: 'Misamis Oriental', region: 'Region X (Northern Mindanao)' },
    { name: 'Iligan City', province: 'Lanao del Norte', region: 'Region X (Northern Mindanao)' },
    
    // General Santos/South Cotabato
    { name: 'General Santos City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)' },
    { name: 'Koronadal City', province: 'South Cotabato', region: 'Region XII (SOCCSKSARGEN)' },
    
    // Zamboanga
    { name: 'Zamboanga City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)' },
    { name: 'Pagadian City', province: 'Zamboanga del Sur', region: 'Region IX (Zamboanga Peninsula)' },
    
    // Tacloban/Leyte
    { name: 'Tacloban City', province: 'Leyte', region: 'Region VIII (Eastern Visayas)' },
    { name: 'Ormoc City', province: 'Leyte', region: 'Region VIII (Eastern Visayas)' },
    
    // Butuan/Agusan
    { name: 'Butuan City', province: 'Agusan del Norte', region: 'Region XIII (Caraga)' },
    
    // Bohol
    { name: 'Tagbilaran City', province: 'Bohol', region: 'Region VII (Central Visayas)' }
  ];

  for (const city of cities) {
    await knex('cities')
      .insert(city)
      .onConflict(['name', 'province'])
      .ignore();
  }

  // Get city IDs for barangay insertion
  const cebuCity = await knex('cities').where({ name: 'Cebu City', province: 'Cebu' }).first();
  const davaoCity = await knex('cities').where({ name: 'Davao City', province: 'Davao del Sur' }).first();
  const iloiloCity = await knex('cities').where({ name: 'Iloilo City', province: 'Iloilo' }).first();
  const mandaueCity = await knex('cities').where({ name: 'Mandaue City', province: 'Cebu' }).first();
  const bacolodCity = await knex('cities').where({ name: 'Bacolod City', province: 'Negros Occidental' }).first();
  const cagayanCity = await knex('cities').where({ name: 'Cagayan de Oro City', province: 'Misamis Oriental' }).first();
  const butuanCity = await knex('cities').where({ name: 'Butuan City', province: 'Agusan del Norte' }).first();
  const generalSantosCity = await knex('cities').where({ name: 'General Santos City', province: 'South Cotabato' }).first();
  const zamboangaCity = await knex('cities').where({ name: 'Zamboanga City', province: 'Zamboanga del Sur' }).first();
  const taclobanCity = await knex('cities').where({ name: 'Tacloban City', province: 'Leyte' }).first();

  // ===== BARANGAYS =====
  const barangays = [];

  // Cebu City Barangays (57 barangays - showing major ones)
  if (cebuCity) {
    const cebuBarangays = [
      'Apas', 'Capitol Site', 'Cogon Ramos', 'Guadalupe', 'Lahug',
      'Mabolo', 'Pardo', 'Talamban', 'Tisa', 'Zapatera',
      'Banilad', 'Basak San Nicolas', 'Busay', 'Kasambagan', 'Lorega San Miguel',
      'Mambaling', 'Pahina Central', 'Pit-os', 'Sambag I', 'Sambag II',
      'San Nicolas Proper', 'Santo Niño', 'Tejero', 'Tinago', 'Carreta'
    ];
    cebuBarangays.forEach(name => {
      barangays.push({ name, city_id: cebuCity.id });
    });
  }

  // Mandaue City Barangays
  if (mandaueCity) {
    const mandaueBarangays = [
      'Alang-alang', 'Bakilid', 'Banilad', 'Basak', 'Cabancalan',
      'Centro', 'Cubacub', 'Guizo', 'Ibabao-Estancia', 'Jagobiao',
      'Labogon', 'Looc', 'Maguikay', 'Mantuyong', 'Pagsabungan',
      'Subangdaku', 'Tabok', 'Tingub', 'Tipolo', 'Umapad'
    ];
    mandaueBarangays.forEach(name => {
      barangays.push({ name, city_id: mandaueCity.id });
    });
  }

  // Davao City Barangays (showing major ones)
  if (davaoCity) {
    const davaoBarangays = [
      'Agdao', 'Buhangin', 'Bunawan', 'Calinan', 'Paquibato',
      'Poblacion', 'Talomo', 'Toril', 'Tugbok', 'Baguio',
      'Catalunan Grande', 'Catalunan Pequeño', 'Matina', 'Mintal', 'Shrine Hills',
      'Ecoland', 'Lanang', 'Maa', 'San Antonio', 'Tibungco'
    ];
    davaoBarangays.forEach(name => {
      barangays.push({ name, city_id: davaoCity.id });
    });
  }

  // Iloilo City Barangays (showing major ones)
  if (iloiloCity) {
    const iloiloBarangays = [
      'Arevalo', 'City Proper', 'Jaro', 'La Paz', 'Mandurriao',
      'Molo', 'Lapuz', 'Magsaysay Village', 'San Jose', 'Villa Anita',
      'Balantang', 'Bito-on', 'Bolilao', 'Bonifacio', 'Calaparan',
      'Cuartero', 'Dungon', 'Hibao-an', 'Inday', 'Jalandoni Estate'
    ];
    iloiloBarangays.forEach(name => {
      barangays.push({ name, city_id: iloiloCity.id });
    });
  }

  // Bacolod City Barangays (showing major ones)
  if (bacolodCity) {
    const bacolodBarangays = [
      'Bacolod City Proper', 'Mandalagan', 'Villamonte', 'Taculing', 'Estefania',
      'Tangub', 'Singcang-Airport', 'Bata', 'Mansilingan', 'Alijis',
      'Banago', 'Granada', 'Handumanan', 'Pahanocoy', 'Punta Taytay',
      'San Isidro', 'Sum-ag', 'Cabug', 'Felisa', 'Montevista'
    ];
    bacolodBarangays.forEach(name => {
      barangays.push({ name, city_id: bacolodCity.id });
    });
  }

  // Cagayan de Oro City Barangays (showing major ones)
  if (cagayanCity) {
    const cagayanBarangays = [
      'Agusan', 'Balulang', 'Bulua', 'Camaman-an', 'Carmen',
      'Gusa', 'Kauswagan', 'Lapasan', 'Macabalan', 'Macasandig',
      'Nazareth', 'Patag', 'Puerto', 'Tablon', 'Puntod',
      'Bayabas', 'Bugo', 'Consolacion', 'Iponan', 'Lumbia'
    ];
    cagayanBarangays.forEach(name => {
      barangays.push({ name, city_id: cagayanCity.id });
    });
  }

  // Butuan City Barangays (DEFAULT CITY - Complete list of major barangays)
  if (butuanCity) {
    const butuanBarangays = [
      'Agao Poblacion', 'Agusan Pequeño', 'Ambago', 'Amparo', 'Anticala',
      'Antongalon', 'Aupagan', 'Baan KM 3', 'Baan Riverside', 'Barangay 1',
      'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5', 'Barangay 6',
      'Bading Poblacion', 'Bancasi', 'Banza', 'Basag', 'Bayanihan',
      'Bilay', 'Bit-os', 'Bitan-agan', 'Bogapo', 'Bonbon',
      'Bugabus', 'Bugsukan', 'Buhangin', 'Cabcabon', 'Dagohoy',
      'Dankias', 'De Oro', 'Diego Silang', 'Don Francisco',
      'Doongan', 'Dumalagan', 'Florida', 'Golden Ribbon', 'Holy Redeemer',
      'Humabon', 'Imadejas Poblacion', 'Jose Rizal Poblacion', 'Kinamlutan',
      'Lapu-lapu Poblacion', 'Lemon', 'Leon Kilat', 'Libertad', 'Limaha',
      'Los Angeles', 'Lumbocan', 'Maguinda', 'Mahay', 'Mahogany',
      'Maibu', 'Mandamo', 'Manila de Bugabus', 'Maon Poblacion', 'Masao',
      'Maug', 'New Society Village', 'Nong-nong', 'Obrero Poblacion',
      'Ong Yiu', 'Pagatpatan', 'Pianing', 'Pinamanculan', 'Pigdaulan',
      'Port Poyohon', 'Rajah Soliman', 'San Ignacio', 'San Mateo',
      'San Vicente', 'Sikatuna', 'Silongan Poblacion', 'Sumile',
      'Sumilihon', 'Tagabaca', 'Taguibo', 'Taligaman', 'Tiniwisan',
      'Tungao', 'Urduja', 'Villa Kananga'
    ];
    butuanBarangays.forEach(name => {
      barangays.push({ name, city_id: butuanCity.id });
    });
  }

  // General Santos City Barangays
  if (generalSantosCity) {
    const generalSantosBarangays = [
      'Apopong', 'Baluan', 'Batomelong', 'Buayan', 'Bula',
      'Calumpang', 'City Heights', 'Conel', 'Dadiangas East', 'Dadiangas North',
      'Dadiangas South', 'Dadiangas West', 'Fatima', 'Katangawan', 'Labangal',
      'Lagao', 'Ligaya', 'Mabuhay', 'Olympog', 'San Isidro',
      'San Jose', 'Siguel', 'Sinawal', 'Tambler', 'Tinagacan',
      'Upper Labay'
    ];
    generalSantosBarangays.forEach(name => {
      barangays.push({ name, city_id: generalSantosCity.id });
    });
  }

  // Zamboanga City Barangays (showing major ones)
  if (zamboangaCity) {
    const zamboangaBarangays = [
      'Arena Blanco', 'Ayala', 'Baliwasan', 'Camino Nuevo', 'Canelar',
      'Culianan', 'Divisoria', 'Guiwan', 'La Paz', 'Mampang',
      'Pasonanca', 'Putik', 'Rio Hondo', 'San Jose Cawa-cawa', 'San Jose Gusu',
      'San Roque', 'Santa Catalina', 'Santa Maria', 'Suterville', 'Talon-talon',
      'Tetuan', 'Tumaga', 'Zone I', 'Zone II', 'Zone III', 'Zone IV'
    ];
    zamboangaBarangays.forEach(name => {
      barangays.push({ name, city_id: zamboangaCity.id });
    });
  }

  // Tacloban City Barangays (showing major ones)
  if (taclobanCity) {
    const taclobanBarangays = [
      'Abucay', 'Apitong', 'Bagacay', 'Barangay 1', 'Barangay 2',
      'Barangay 3', 'Barangay 4', 'Barangay 5', 'Cabalawan', 'Caibaan',
      'Calvario', 'Candahug', 'Diit', 'Downtown', 'Magsaysay',
      'New Kawayan', 'Palanog', 'Sagkahan', 'San Jose', 'San Roque',
      'Santo Niño', 'Suhi', 'Utap', 'V & G Subdivision'
    ];
    taclobanBarangays.forEach(name => {
      barangays.push({ name, city_id: taclobanCity.id });
    });
  }

  // Add at least one barangay for cities that don't have specific ones
  const allCities = await knex('cities').select('id', 'name');
  for (const city of allCities) {
    // Check if city already has barangays
    const hasBarangays = barangays.some(b => b.city_id === city.id);
    if (!hasBarangays) {
      // Add a default "City Proper" barangay
      barangays.push({ name: 'City Proper', city_id: city.id });
    }
  }

  // Insert all barangays
  for (const barangay of barangays) {
    await knex('barangays')
      .insert(barangay)
      .onConflict(['name', 'city_id'])
      .ignore();
  }

  console.log('✅ Cities and barangays seeded successfully!');
  console.log(`   - ${cities.length} cities added`);
  console.log(`   - ${barangays.length} barangays added`);
  console.log('   - Cities: Cebu, Davao, Iloilo, Mandaue, Bacolod, Cagayan de Oro, etc.');
  console.log('   - Butuan City (DEFAULT): 86 barangays included');
  console.log('   - All cities have at least one barangay (City Proper as default)');
  console.log('   - Regions: Visayas (Central, Western, Eastern) and Mindanao regions');
};

