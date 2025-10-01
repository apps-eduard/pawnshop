const { pool } = require('./config/database');

async function createAddressTables() {
  try {
    console.log('🏙️ Creating cities and barangays tables...');
    
    // Create cities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        province VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create barangays table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barangays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_barangays_city_id ON barangays(city_id)');
    
    console.log('✅ Cities and barangays tables created successfully!');
    
    // Insert sample cities
    console.log('🏙️ Inserting cities...');
    await pool.query(`
      INSERT INTO cities (name, province) VALUES 
      ('Manila', 'Metro Manila'),
      ('Quezon City', 'Metro Manila'),
      ('Makati', 'Metro Manila'),
      ('Taguig', 'Metro Manila'),
      ('Pasig', 'Metro Manila'),
      ('Caloocan', 'Metro Manila'),
      ('Las Piñas', 'Metro Manila'),
      ('Marikina', 'Metro Manila'),
      ('Muntinlupa', 'Metro Manila'),
      ('Parañaque', 'Metro Manila'),
      ('Pasay', 'Metro Manila'),
      ('Pateros', 'Metro Manila'),
      ('San Juan', 'Metro Manila'),
      ('Valenzuela', 'Metro Manila'),
      ('Malabon', 'Metro Manila'),
      ('Navotas', 'Metro Manila'),
      ('Mandaluyong', 'Metro Manila')
      ON CONFLICT DO NOTHING
    `);
    
    // Get city IDs and insert barangays
    const cities = await pool.query('SELECT id, name FROM cities ORDER BY id');
    console.log('✅ Cities created:', cities.rows.length);
    
    console.log('🏘️ Inserting barangays...');
    for (const city of cities.rows) {
      let barangays = [];
      
      switch (city.name) {
        case 'Manila':
          barangays = ['Ermita', 'Malate', 'Intramuros', 'Binondo', 'Quiapo', 'Sampaloc', 'Tondo', 'San Miguel', 'Sta. Ana', 'Paco'];
          break;
        case 'Quezon City':
          barangays = ['Diliman', 'Cubao', 'Bago Bantay', 'Bagong Pag-asa', 'Balingasa', 'Project 4', 'Project 6', 'Fairview', 'Commonwealth', 'Novaliches'];
          break;
        case 'Makati':
          barangays = ['Poblacion', 'Bel-Air', 'Salcedo Village', 'Legazpi Village', 'San Lorenzo', 'Urdaneta', 'Valenzuela', 'Forbes Park', 'Dasmariñas', 'Magallanes'];
          break;
        case 'Taguig':
          barangays = ['Bonifacio Global City', 'Lower Bicutan', 'Upper Bicutan', 'Pinagsama', 'Signal Village', 'Fort Bonifacio', 'Napindan', 'Hagonoy', 'Ibayo-Tipas', 'Ligid-Tipas'];
          break;
        case 'Pasig':
          barangays = ['Rosario', 'Kapitolyo', 'Ugong', 'Ortigas Center', 'Manggahan', 'Pinagbuhatan', 'Bagong Ilog', 'Dela Paz', 'Maybunga', 'San Antonio'];
          break;
        default:
          barangays = ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'];
      }
      
      for (const barangayName of barangays) {
        await pool.query(
          'INSERT INTO barangays (name, city_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [barangayName, city.id]
        );
      }
    }
    
    const barangayCount = await pool.query('SELECT COUNT(*) FROM barangays');
    console.log('✅ Barangays created:', barangayCount.rows[0].count);
    
    await pool.end();
    console.log('🎉 Address tables setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating address tables:', error);
    await pool.end();
    process.exit(1);
  }
}

createAddressTables();