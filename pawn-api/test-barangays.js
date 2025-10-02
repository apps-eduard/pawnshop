const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '123',
  database: 'pawnshop_db',
  port: 5432
});

async function testBarangays() {
  try {
    console.log('🏙️ Checking cities...');
    const cities = await pool.query('SELECT id, name FROM cities ORDER BY name');
    console.log('Cities found:', cities.rows.length);
    cities.rows.forEach(city => {
      console.log(`  - ${city.name} (ID: ${city.id})`);
    });

    console.log('\n🏘️ Checking barangays...');
    const barangays = await pool.query(`
      SELECT b.id, b.name, b.city_id, c.name as city_name 
      FROM barangays b 
      LEFT JOIN cities c ON b.city_id = c.id
      ORDER BY c.name, b.name
    `);
    console.log('Barangays found:', barangays.rows.length);
    
    if (barangays.rows.length === 0) {
      console.log('❌ No barangays found! Adding sample data...');
      await addSampleBarangays(cities.rows);
    } else {
      barangays.rows.forEach(barangay => {
        console.log(`  - ${barangay.name} (City: ${barangay.city_name}, City ID: ${barangay.city_id})`);
      });
    }

    console.log('\n✅ Database check completed');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function addSampleBarangays(cities) {
  try {
    const sampleBarangays = [
      // Cebu City barangays
      { name: 'Lahug', cityName: 'Cebu City' },
      { name: 'Banilad', cityName: 'Cebu City' },
      { name: 'Capitol Site', cityName: 'Cebu City' },
      { name: 'Colon', cityName: 'Cebu City' },
      { name: 'Fuente', cityName: 'Cebu City' },
      
      // Manila barangays
      { name: 'Ermita', cityName: 'Manila' },
      { name: 'Malate', cityName: 'Manila' },
      { name: 'Binondo', cityName: 'Manila' },
      { name: 'Intramuros', cityName: 'Manila' },
      { name: 'Tondo', cityName: 'Manila' },
      
      // Quezon City barangays
      { name: 'Diliman', cityName: 'Quezon City' },
      { name: 'Cubao', cityName: 'Quezon City' },
      { name: 'Project 8', cityName: 'Quezon City' },
      { name: 'Commonwealth', cityName: 'Quezon City' },
      { name: 'Fairview', cityName: 'Quezon City' },
    ];

    for (const barangay of sampleBarangays) {
      const city = cities.find(c => c.name === barangay.cityName);
      if (city) {
        await pool.query(
          'INSERT INTO barangays (name, city_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [barangay.name, city.id]
        );
        console.log(`  ✅ Added ${barangay.name} to ${barangay.cityName}`);
      }
    }
    
    console.log('✅ Sample barangays added');
  } catch (error) {
    console.error('❌ Error adding sample barangays:', error.message);
  }
}

testBarangays();