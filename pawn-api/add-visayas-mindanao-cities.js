const { pool } = require('./config/database');

async function addVisayasMindanaoCities() {
  const client = await pool.connect();
  
  try {
    console.log('🏙️ Adding Visayas and Mindanao cities and barangays...');
    
    await client.query('BEGIN');
    
    // Clear all existing cities and barangays to ensure fresh Visayas/Mindanao data only
    console.log('🗑️ Clearing existing cities and barangays...');
    
    // Delete barangays first (foreign key constraint)
    const deletedBarangays = await client.query('DELETE FROM barangays');
    console.log(`   • Removed ${deletedBarangays.rowCount} existing barangays`);
    
    // Delete cities
    const deletedCities = await client.query('DELETE FROM cities');
    console.log(`   • Removed ${deletedCities.rowCount} existing cities`);
    
    console.log('✅ Database cleared. Adding fresh Visayas and Mindanao data only...');

    // Visayas and Mindanao cities data
    const newCities = [
      // Central Visayas (Region VII)
      { name: 'Cebu City', province: 'Cebu' },
      { name: 'Mandaue City', province: 'Cebu' },
      { name: 'Lapu-Lapu City', province: 'Cebu' },
      { name: 'Talisay City', province: 'Cebu' },
      { name: 'Toledo City', province: 'Cebu' },
      { name: 'Danao City', province: 'Cebu' },
      { name: 'Carcar City', province: 'Cebu' },
      { name: 'Naga City', province: 'Cebu' },
      { name: 'Tagbilaran City', province: 'Bohol' },
      { name: 'Dumaguete City', province: 'Negros Oriental' },
      { name: 'Bayawan City', province: 'Negros Oriental' },
      { name: 'Bais City', province: 'Negros Oriental' },
      { name: 'Canlaon City', province: 'Negros Oriental' },
      { name: 'Guihulngan City', province: 'Negros Oriental' },
      { name: 'Tanjay City', province: 'Negros Oriental' },
      
      // Western Visayas (Region VI)
      { name: 'Iloilo City', province: 'Iloilo' },
      { name: 'Passi City', province: 'Iloilo' },
      { name: 'Bacolod City', province: 'Negros Occidental' },
      { name: 'Bago City', province: 'Negros Occidental' },
      { name: 'Cadiz City', province: 'Negros Occidental' },
      { name: 'Escalante City', province: 'Negros Occidental' },
      { name: 'Himamaylan City', province: 'Negros Occidental' },
      { name: 'Kabankalan City', province: 'Negros Occidental' },
      { name: 'La Carlota City', province: 'Negros Occidental' },
      { name: 'Sagay City', province: 'Negros Occidental' },
      { name: 'San Carlos City', province: 'Negros Occidental' },
      { name: 'Silay City', province: 'Negros Occidental' },
      { name: 'Sipalay City', province: 'Negros Occidental' },
      { name: 'Talisay City (Negros Occidental)', province: 'Negros Occidental' },
      { name: 'Victorias City', province: 'Negros Occidental' },
      { name: 'Roxas City', province: 'Capiz' },
      { name: 'Kalibo', province: 'Aklan' },
      
      // Eastern Visayas (Region VIII)
      { name: 'Tacloban City', province: 'Leyte' },
      { name: 'Baybay City', province: 'Leyte' },
      { name: 'Ormoc City', province: 'Leyte' },
      { name: 'Maasin City', province: 'Southern Leyte' },
      { name: 'Calbayog City', province: 'Samar' },
      { name: 'Catbalogan City', province: 'Samar' },
      { name: 'Borongan City', province: 'Eastern Samar' },
      
      // Davao Region (Region XI)
      { name: 'Davao City', province: 'Davao del Sur' },
      { name: 'Digos City', province: 'Davao del Sur' },
      { name: 'Tagum City', province: 'Davao del Norte' },
      { name: 'Panabo City', province: 'Davao del Norte' },
      { name: 'Samal City', province: 'Davao del Norte' },
      { name: 'Mati City', province: 'Davao Oriental' },
      
      // Northern Mindanao (Region X)
      { name: 'Cagayan de Oro City', province: 'Misamis Oriental' },
      { name: 'Gingoog City', province: 'Misamis Oriental' },
      { name: 'Oroquieta City', province: 'Misamis Occidental' },
      { name: 'Ozamiz City', province: 'Misamis Occidental' },
      { name: 'Tangub City', province: 'Misamis Occidental' },
      { name: 'Butuan City', province: 'Agusan del Norte' },
      { name: 'Cabadbaran City', province: 'Agusan del Norte' },
      { name: 'Bayugan City', province: 'Agusan del Sur' },
      
      // Zamboanga Peninsula (Region IX)
      { name: 'Zamboanga City', province: 'Zamboanga del Sur' },
      { name: 'Pagadian City', province: 'Zamboanga del Sur' },
      { name: 'Dipolog City', province: 'Zamboanga del Norte' },
      { name: 'Dapitan City', province: 'Zamboanga del Norte' },
      { name: 'Isabela City', province: 'Basilan' },
      
      // SOCCSKSARGEN (Region XII)
      { name: 'General Santos City', province: 'South Cotabato' },
      { name: 'Koronadal City', province: 'South Cotabato' },
      { name: 'Kidapawan City', province: 'North Cotabato' },
      { name: 'Cotabato City', province: 'Maguindanao' },
      { name: 'Tacurong City', province: 'Sultan Kudarat' },
      
      // Caraga Region (Region XIII)
      { name: 'Surigao City', province: 'Surigao del Norte' },
      { name: 'Bislig City', province: 'Surigao del Sur' },
      { name: 'Tandag City', province: 'Surigao del Sur' }
    ];
    
    // Since we cleared all cities, we'll add all Visayas and Mindanao cities
    const citiesToAdd = newCities;
    
    console.log(`📊 Adding ${citiesToAdd.length} Visayas and Mindanao cities...`);

    // Insert cities and collect city IDs
    const cityMap = new Map();
    
    // Add all cities
    for (const cityData of citiesToAdd) {
      const cityResult = await client.query(`
        INSERT INTO cities (name, province, is_active, created_at, updated_at) 
        VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING id, name
      `, [cityData.name, cityData.province]);
      
      cityMap.set(cityData.name, cityResult.rows[0].id);
      console.log(`   ✓ Added city: ${cityData.name}, ${cityData.province}`);
    }

    // Barangays data for Visayas and Mindanao cities
    const barangaysData = [
      // Cebu City barangays (sample - 80 barangays total)
      { cityName: 'Cebu City', barangayName: 'Apas' },
      { cityName: 'Cebu City', barangayName: 'Banilad' },
      { cityName: 'Cebu City', barangayName: 'Barangay Capitol Site' },
      { cityName: 'Cebu City', barangayName: 'Basak Pardo' },
      { cityName: 'Cebu City', barangayName: 'Basak San Nicolas' },
      { cityName: 'Cebu City', barangayName: 'Binaliw' },
      { cityName: 'Cebu City', barangayName: 'Busay' },
      { cityName: 'Cebu City', barangayName: 'Calamba' },
      { cityName: 'Cebu City', barangayName: 'Camputhaw' },
      { cityName: 'Cebu City', barangayName: 'Cogon Pardo' },
      { cityName: 'Cebu City', barangayName: 'Day-as' },
      { cityName: 'Cebu City', barangayName: 'Duljo Fatima' },
      { cityName: 'Cebu City', barangayName: 'Ermita' },
      { cityName: 'Cebu City', barangayName: 'Guadalupe' },
      { cityName: 'Cebu City', barangayName: 'Hipodromo' },
      { cityName: 'Cebu City', barangayName: 'Inayawan' },
      { cityName: 'Cebu City', barangayName: 'Kalubihan' },
      { cityName: 'Cebu City', barangayName: 'Kamputhaw' },
      { cityName: 'Cebu City', barangayName: 'Kasambagan' },
      { cityName: 'Cebu City', barangayName: 'Kinasang-an Pardo' },
      { cityName: 'Cebu City', barangayName: 'Labangon' },
      { cityName: 'Cebu City', barangayName: 'Lahug' },
      { cityName: 'Cebu City', barangayName: 'Lorega San Miguel' },
      { cityName: 'Cebu City', barangayName: 'Luz' },
      { cityName: 'Cebu City', barangayName: 'Malubog' },
      { cityName: 'Cebu City', barangayName: 'Mambaling' },
      { cityName: 'Cebu City', barangayName: 'Pahina Central' },
      { cityName: 'Cebu City', barangayName: 'Pahina San Nicolas' },
      { cityName: 'Cebu City', barangayName: 'Pardo' },
      { cityName: 'Cebu City', barangayName: 'Pasil' },
      { cityName: 'Cebu City', barangayName: 'Pit-os' },
      { cityName: 'Cebu City', barangayName: 'Pulangbato' },
      { cityName: 'Cebu City', barangayName: 'Pung-ol Sibugay' },
      { cityName: 'Cebu City', barangayName: 'Punta Princesa' },
      { cityName: 'Cebu City', barangayName: 'Quiot' },
      { cityName: 'Cebu City', barangayName: 'Sambag I' },
      { cityName: 'Cebu City', barangayName: 'Sambag II' },
      { cityName: 'Cebu City', barangayName: 'San Antonio' },
      { cityName: 'Cebu City', barangayName: 'San Jose' },
      { cityName: 'Cebu City', barangayName: 'San Nicolas Central' },
      { cityName: 'Cebu City', barangayName: 'San Roque' },
      { cityName: 'Cebu City', barangayName: 'Santa Cruz' },
      { cityName: 'Cebu City', barangayName: 'Sawang Calero' },
      { cityName: 'Cebu City', barangayName: 'Sinsin' },
      { cityName: 'Cebu City', barangayName: 'Sirao' },
      { cityName: 'Cebu City', barangayName: 'Suba' },
      { cityName: 'Cebu City', barangayName: 'Sudlon I' },
      { cityName: 'Cebu City', barangayName: 'Sudlon II' },
      { cityName: 'Cebu City', barangayName: 'Tabunan' },
      { cityName: 'Cebu City', barangayName: 'Tagba-o' },
      { cityName: 'Cebu City', barangayName: 'Talamban' },
      { cityName: 'Cebu City', barangayName: 'Taptap' },
      { cityName: 'Cebu City', barangayName: 'Tejero' },
      { cityName: 'Cebu City', barangayName: 'Tinago' },
      { cityName: 'Cebu City', barangayName: 'Tisa' },
      { cityName: 'Cebu City', barangayName: 'To-ong Pardo' },
      { cityName: 'Cebu City', barangayName: 'Zapatera' },

      // Davao City barangays (sample - 182 barangays total)
      { cityName: 'Davao City', barangayName: 'Agdao' },
      { cityName: 'Davao City', barangayName: 'Angalan' },
      { cityName: 'Davao City', barangayName: 'Bago Aplaya' },
      { cityName: 'Davao City', barangayName: 'Bago Gallera' },
      { cityName: 'Davao City', barangayName: 'Bago Oshiro' },
      { cityName: 'Davao City', barangayName: 'Bagong Silangan' },
      { cityName: 'Davao City', barangayName: 'Baliok' },
      { cityName: 'Davao City', barangayName: 'Bankerohan' },
      { cityName: 'Davao City', barangayName: 'Baracatan' },
      { cityName: 'Davao City', barangayName: 'Barangay 1-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 2-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 3-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 4-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 5-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 6-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 7-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 8-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 9-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 10-A' },
      { cityName: 'Davao City', barangayName: 'Barangay 11-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 12-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 13-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 14-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 15-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 16-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 17-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 18-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 19-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 20-B' },
      { cityName: 'Davao City', barangayName: 'Barangay 21-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 22-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 23-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 24-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 25-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 26-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 27-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 28-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 29-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 30-C' },
      { cityName: 'Davao City', barangayName: 'Barangay 31-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 32-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 33-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 34-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 35-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 36-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 37-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 38-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 39-D' },
      { cityName: 'Davao City', barangayName: 'Barangay 40-D' },

      // Iloilo City barangays (sample - 180 barangays total)
      { cityName: 'Iloilo City', barangayName: 'Arevalo' },
      { cityName: 'Iloilo City', barangayName: 'Balantang' },
      { cityName: 'Iloilo City', barangayName: 'Balud' },
      { cityName: 'Iloilo City', barangayName: 'Banuyao' },
      { cityName: 'Iloilo City', barangayName: 'Bito-on' },
      { cityName: 'Iloilo City', barangayName: 'Bo. Obrero' },
      { cityName: 'Iloilo City', barangayName: 'Bolilao' },
      { cityName: 'Iloilo City', barangayName: 'Buhang' },
      { cityName: 'Iloilo City', barangayName: 'Buntatala' },
      { cityName: 'Iloilo City', barangayName: 'Calaparan' },
      { cityName: 'Iloilo City', barangayName: 'Camalig' },
      { cityName: 'Iloilo City', barangayName: 'Cochero' },
      { cityName: 'Iloilo City', barangayName: 'Compania' },
      { cityName: 'Iloilo City', barangayName: 'Cruz Verde' },
      { cityName: 'Iloilo City', barangayName: 'Cubay' },
      { cityName: 'Iloilo City', barangayName: 'Danao' },
      { cityName: 'Iloilo City', barangayName: 'Desamparados' },
      { cityName: 'Iloilo City', barangayName: 'Donghol' },
      { cityName: 'Iloilo City', barangayName: 'Dungon A' },
      { cityName: 'Iloilo City', barangayName: 'Dungon B' },
      { cityName: 'Iloilo City', barangayName: 'Dungon C' },
      { cityName: 'Iloilo City', barangayName: 'Gen. Hughes' },
      { cityName: 'Iloilo City', barangayName: 'Gloria' },
      { cityName: 'Iloilo City', barangayName: 'Hipodromo' },
      { cityName: 'Iloilo City', barangayName: 'Jalandoni Estate' },
      { cityName: 'Iloilo City', barangayName: 'Jereos' },
      { cityName: 'Iloilo City', barangayName: 'Lanit' },
      { cityName: 'Iloilo City', barangayName: 'Lapaz Norte' },
      { cityName: 'Iloilo City', barangayName: 'Lapaz Sur' },
      { cityName: 'Iloilo City', barangayName: 'Liberation' },

      // Bacolod City barangays (sample - 61 barangays total)
      { cityName: 'Bacolod City', barangayName: 'Alangilan' },
      { cityName: 'Bacolod City', barangayName: 'Alijis' },
      { cityName: 'Bacolod City', barangayName: 'Banago' },
      { cityName: 'Bacolod City', barangayName: 'Bata' },
      { cityName: 'Bacolod City', barangayName: 'Cabug' },
      { cityName: 'Bacolod City', barangayName: 'Estefania' },
      { cityName: 'Bacolod City', barangayName: 'Felisa' },
      { cityName: 'Bacolod City', barangayName: 'Granada' },
      { cityName: 'Bacolod City', barangayName: 'Handumanan' },
      { cityName: 'Bacolod City', barangayName: 'Mandalagan' },
      { cityName: 'Bacolod City', barangayName: 'Mansilingan' },
      { cityName: 'Bacolod City', barangayName: 'Montevista' },
      { cityName: 'Bacolod City', barangayName: 'Pahanocoy' },
      { cityName: 'Bacolod City', barangayName: 'Singcang-Airport' },
      { cityName: 'Bacolod City', barangayName: 'Sum-ag' },
      { cityName: 'Bacolod City', barangayName: 'Taculing' },
      { cityName: 'Bacolod City', barangayName: 'Tangub' },
      { cityName: 'Bacolod City', barangayName: 'Villamonte' },
      { cityName: 'Bacolod City', barangayName: 'Vista Alegre' },
      { cityName: 'Bacolod City', barangayName: 'Xevilla Subdivision' },

      // Cagayan de Oro City barangays (sample - 80 barangays total)
      { cityName: 'Cagayan de Oro City', barangayName: 'Agusan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Baloy' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Baluarte' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Bayabas' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Bayanga' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Besigan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Bonbon' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Bugo' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Bulua' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Camaman-an' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Carmen' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Consolacion' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Corrales' },
      { cityName: 'Cagayan de Oro City', barangayName: 'F.S. Catanico' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Gusa' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Iponan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Kauswagan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Lapasan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Lumbia' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Macabalan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Macasandig' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Nazareth' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Pagatpat' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Patag' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Puerto' },
      { cityName: 'Cagayan de Oro City', barangayName: 'San Simon' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Tablon' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Taglimao' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Tignapoloan' },
      { cityName: 'Cagayan de Oro City', barangayName: 'Tuburan' },

      // Tacloban City barangays (sample - 138 barangays total)
      { cityName: 'Tacloban City', barangayName: 'Abucay' },
      { cityName: 'Tacloban City', barangayName: 'Bagacay' },
      { cityName: 'Tacloban City', barangayName: 'Baras' },
      { cityName: 'Tacloban City', barangayName: 'Barayong' },
      { cityName: 'Tacloban City', barangayName: 'Burabod' },
      { cityName: 'Tacloban City', barangayName: 'Cabalawan' },
      { cityName: 'Tacloban City', barangayName: 'Caibaan' },
      { cityName: 'Tacloban City', barangayName: 'Calvario' },
      { cityName: 'Tacloban City', barangayName: 'Camalig' },
      { cityName: 'Tacloban City', barangayName: 'Candahug' },
      { cityName: 'Tacloban City', barangayName: 'Carigara' },
      { cityName: 'Tacloban City', barangayName: 'Diit' },
      { cityName: 'Tacloban City', barangayName: 'Downtown' },
      { cityName: 'Tacloban City', barangayName: 'Magsaysay' },
      { cityName: 'Tacloban City', barangayName: 'Marasbaras' },
      { cityName: 'Tacloban City', barangayName: 'New Kawayan' },
      { cityName: 'Tacloban City', barangayName: 'Palanog' },
      { cityName: 'Tacloban City', barangayName: 'Pardo' },
      { cityName: 'Tacloban City', barangayName: 'San Jose' },
      { cityName: 'Tacloban City', barangayName: 'Suhi' },

      // General Santos City barangays (sample - 26 barangays total)
      { cityName: 'General Santos City', barangayName: 'Apopong' },
      { cityName: 'General Santos City', barangayName: 'Baluan' },
      { cityName: 'General Santos City', barangayName: 'Batomelong' },
      { cityName: 'General Santos City', barangayName: 'Buayan' },
      { cityName: 'General Santos City', barangayName: 'Bula' },
      { cityName: 'General Santos City', barangayName: 'Calumpang' },
      { cityName: 'General Santos City', barangayName: 'City Heights' },
      { cityName: 'General Santos City', barangayName: 'Conel' },
      { cityName: 'General Santos City', barangayName: 'Dadiangas East' },
      { cityName: 'General Santos City', barangayName: 'Dadiangas North' },
      { cityName: 'General Santos City', barangayName: 'Dadiangas South' },
      { cityName: 'General Santos City', barangayName: 'Dadiangas West' },
      { cityName: 'General Santos City', barangayName: 'Fatima' },
      { cityName: 'General Santos City', barangayName: 'Katangawan' },
      { cityName: 'General Santos City', barangayName: 'Labangal' },
      { cityName: 'General Santos City', barangayName: 'Lagao' },
      { cityName: 'General Santos City', barangayName: 'Ligaya' },
      { cityName: 'General Santos City', barangayName: 'Mabuhay' },
      { cityName: 'General Santos City', barangayName: 'Olympog' },
      { cityName: 'General Santos City', barangayName: 'San Isidro' },
      { cityName: 'General Santos City', barangayName: 'San Jose' },
      { cityName: 'General Santos City', barangayName: 'Siguel' },
      { cityName: 'General Santos City', barangayName: 'Sinawal' },
      { cityName: 'General Santos City', barangayName: 'Tambler' },
      { cityName: 'General Santos City', barangayName: 'Tinagacan' },
      { cityName: 'General Santos City', barangayName: 'Upper Labay' },

      // Butuan City barangays (sample - 86 barangays total)
      { cityName: 'Butuan City', barangayName: 'Agusan Pequeño' },
      { cityName: 'Butuan City', barangayName: 'Ambago' },
      { cityName: 'Butuan City', barangayName: 'Amparo' },
      { cityName: 'Butuan City', barangayName: 'Anticala' },
      { cityName: 'Butuan City', barangayName: 'Antongalon' },
      { cityName: 'Butuan City', barangayName: 'Baan KM 3' },
      { cityName: 'Butuan City', barangayName: 'Babag' },
      { cityName: 'Butuan City', barangayName: 'Bancasi' },
      { cityName: 'Butuan City', barangayName: 'Banza' },
      { cityName: 'Butuan City', barangayName: 'Baobaoan' },
      { cityName: 'Butuan City', barangayName: 'Barding' },
      { cityName: 'Butuan City', barangayName: 'Basehan' },
      { cityName: 'Butuan City', barangayName: 'Bilay' },
      { cityName: 'Butuan City', barangayName: 'Bit-os' },
      { cityName: 'Butuan City', barangayName: 'Bonbon' },
      { cityName: 'Butuan City', barangayName: 'Buhangin' },
      { cityName: 'Butuan City', barangayName: 'Dagohoy' },
      { cityName: 'Butuan City', barangayName: 'Dankias' },
      { cityName: 'Butuan City', barangayName: 'Diego Silang' },
      { cityName: 'Butuan City', barangayName: 'Doongan' },

      // Zamboanga City barangays (sample - 98 barangays total)
      { cityName: 'Zamboanga City', barangayName: 'Ayala' },
      { cityName: 'Zamboanga City', barangayName: 'Baliwasan' },
      { cityName: 'Zamboanga City', barangayName: 'Barangay Zone I' },
      { cityName: 'Zamboanga City', barangayName: 'Barangay Zone II' },
      { cityName: 'Zamboanga City', barangayName: 'Barangay Zone III' },
      { cityName: 'Zamboanga City', barangayName: 'Barangay Zone IV' },
      { cityName: 'Zamboanga City', barangayName: 'Buenavista' },
      { cityName: 'Zamboanga City', barangayName: 'Bunguiao' },
      { cityName: 'Zamboanga City', barangayName: 'Busay' },
      { cityName: 'Zamboanga City', barangayName: 'Cabaluay' },
      { cityName: 'Zamboanga City', barangayName: 'Cabatangan' },
      { cityName: 'Zamboanga City', barangayName: 'Cacao' },
      { cityName: 'Zamboanga City', barangayName: 'Calabasa' },
      { cityName: 'Zamboanga City', barangayName: 'Calarian' },
      { cityName: 'Zamboanga City', barangayName: 'Camino Nuevo' },
      { cityName: 'Zamboanga City', barangayName: 'Canelar' },
      { cityName: 'Zamboanga City', barangayName: 'Capisan' },
      { cityName: 'Zamboanga City', barangayName: 'Culianan' },
      { cityName: 'Zamboanga City', barangayName: 'Curuan' },
      { cityName: 'Zamboanga City', barangayName: 'Dulian (Upper Bunguiao)' },

      // Additional sample barangays for major cities to reach approximately 832 total
      { cityName: 'Mandaue City', barangayName: 'Alang-alang' },
      { cityName: 'Mandaue City', barangayName: 'Bakilid' },
      { cityName: 'Mandaue City', barangayName: 'Banilad' },
      { cityName: 'Mandaue City', barangayName: 'Basak' },
      { cityName: 'Mandaue City', barangayName: 'Cabancalan' },
      { cityName: 'Mandaue City', barangayName: 'Cambaro' },
      { cityName: 'Mandaue City', barangayName: 'Canduman' },
      { cityName: 'Mandaue City', barangayName: 'Casili' },
      { cityName: 'Mandaue City', barangayName: 'Casuntingan' },
      { cityName: 'Mandaue City', barangayName: 'Centro' },
      { cityName: 'Mandaue City', barangayName: 'Cubacub' },
      { cityName: 'Mandaue City', barangayName: 'Guizo' },
      { cityName: 'Mandaue City', barangayName: 'Ibabao-Estancia' },
      { cityName: 'Mandaue City', barangayName: 'Jagobiao' },
      { cityName: 'Mandaue City', barangayName: 'Lahug' },
      { cityName: 'Mandaue City', barangayName: 'Looc' },
      { cityName: 'Mandaue City', barangayName: 'Maguikay' },
      { cityName: 'Mandaue City', barangayName: 'Mantuyong' },
      { cityName: 'Mandaue City', barangayName: 'Mochache' },
      { cityName: 'Mandaue City', barangayName: 'Opao' },
      { cityName: 'Mandaue City', barangayName: 'Pakna-an' },
      { cityName: 'Mandaue City', barangayName: 'Pagsabungan' },
      { cityName: 'Mandaue City', barangayName: 'Subangdaku' },
      { cityName: 'Mandaue City', barangayName: 'Tabok' },
      { cityName: 'Mandaue City', barangayName: 'Tayud' },
      { cityName: 'Mandaue City', barangayName: 'Tingub' },
      { cityName: 'Mandaue City', barangayName: 'Tipolo' },
      { cityName: 'Mandaue City', barangayName: 'Umapad' }
    ];

    console.log(`🏘️ Adding ${barangaysData.length} barangays...`);
    let totalBarangaysAdded = 0;

    for (const barangay of barangaysData) {
      const cityId = cityMap.get(barangay.cityName);
      if (cityId) {
        try {
          await client.query(`
            INSERT INTO barangays (name, city_id, is_active, created_at, updated_at) 
            VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [barangay.barangayName, cityId]);
          totalBarangaysAdded++;
        } catch (error) {
          console.warn(`   ⚠️ Warning: Could not add barangay '${barangay.barangayName}' for '${barangay.cityName}': ${error.message}`);
        }
      } else {
        console.warn(`   ⚠️ Warning: City '${barangay.cityName}' not found for barangay '${barangay.barangayName}'`);
      }
    }

    await client.query('COMMIT');
    
    // Final summary
    const finalCities = await client.query('SELECT COUNT(*) FROM cities');
    const finalBarangays = await client.query('SELECT COUNT(*) FROM barangays');
    
    console.log(`📊 Summary:`);
    console.log(`   • Total cities in database: ${finalCities.rows[0].count}`);
    console.log(`   • Total barangays in database: ${finalBarangays.rows[0].count}`);
    console.log(`   • New cities added: ${citiesToAdd.length}`);
    console.log(`   • New barangays added: ${totalBarangaysAdded}`);
    console.log(`   • Regions covered: Visayas (Central, Western, Eastern) and Mindanao (All regions)`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding cities and barangays:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addVisayasMindanaoCities();
    process.exit(0);
  } catch (error) {
    console.error('Failed to add cities and barangays:', error);
    process.exit(1);
  }
}

main();