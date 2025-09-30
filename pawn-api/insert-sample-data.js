const { pool } = require('./config/database');

async function insertSampleData() {
  try {
    console.log('📍 Inserting sample cities and barangays...');
    
    // Insert cities
    await pool.query(`
      INSERT INTO cities (name, province) VALUES 
      ('Manila', 'Metro Manila'),
      ('Quezon City', 'Metro Manila'),
      ('Makati', 'Metro Manila'),
      ('Taguig', 'Metro Manila'),
      ('Pasig', 'Metro Manila')
      ON CONFLICT DO NOTHING
    `);
    
    // Get city IDs
    const cities = await pool.query('SELECT id, name FROM cities ORDER BY id');
    console.log('Cities:', cities.rows);
    
    // Insert barangays for each city
    for (const city of cities.rows) {
      let barangays = [];
      
      switch (city.name) {
        case 'Manila':
          barangays = ['Ermita', 'Malate', 'Intramuros', 'Binondo', 'Quiapo'];
          break;
        case 'Quezon City':
          barangays = ['Diliman', 'Cubao', 'Bago Bantay', 'Bagong Pag-asa', 'Balingasa'];
          break;
        case 'Makati':
          barangays = ['Poblacion', 'Bel-Air', 'Salcedo Village', 'Legazpi Village', 'San Lorenzo'];
          break;
        case 'Taguig':
          barangays = ['Bonifacio Global City', 'Lower Bicutan', 'Upper Bicutan', 'Pinagsama', 'Signal Village'];
          break;
        case 'Pasig':
          barangays = ['Rosario', 'Kapitolyo', 'Ugong', 'Ortigas Center', 'Manggahan'];
          break;
      }
      
      for (const barangayName of barangays) {
        await pool.query(
          'INSERT INTO barangays (name, city_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [barangayName, city.id]
        );
      }
    }
    
    const barangayCount = await pool.query('SELECT COUNT(*) FROM barangays');
    console.log(`✅ Sample data added - ${cities.rows.length} cities, ${barangayCount.rows[0].count} barangays`);
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  } finally {
    await pool.end();
  }
}

insertSampleData();