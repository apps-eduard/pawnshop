const { pool } = require('./config/database');

async function checkAddressData() {
  try {
    console.log('🔍 Checking current address data...\n');
    
    // Check for duplicate cities
    console.log('=== DUPLICATE CITIES ===');
    const duplicateCities = await pool.query(`
      SELECT LOWER(name) as lower_name, array_agg(name) as names, COUNT(*) as count 
      FROM cities 
      GROUP BY LOWER(name) 
      HAVING COUNT(*) > 1
      ORDER BY LOWER(name)
    `);
    
    if (duplicateCities.rows.length > 0) {
      console.log('Found duplicate cities:');
      duplicateCities.rows.forEach(row => {
        console.log(`- ${row.names.join(', ')}: ${row.count} times`);
      });
    } else {
      console.log('No duplicate cities found.');
    }
    
    // Check all cities
    console.log('\n=== ALL CITIES ===');
    const allCities = await pool.query('SELECT id, name, province FROM cities ORDER BY name');
    console.log(`Total cities: ${allCities.rows.length}`);
    allCities.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: ${row.name}, Province: ${row.province || 'N/A'}`);
    });
    
    // Check for duplicate barangays
    console.log('\n=== DUPLICATE BARANGAYS ===');
    const duplicateBarangays = await pool.query(`
      SELECT b.name, c.name as city_name, COUNT(*) as count
      FROM barangays b 
      JOIN cities c ON b.city_id = c.id
      GROUP BY b.name, c.name, b.city_id
      HAVING COUNT(*) > 1
      ORDER BY b.name, c.name
    `);
    
    if (duplicateBarangays.rows.length > 0) {
      console.log('Found duplicate barangays:');
      duplicateBarangays.rows.forEach(row => {
        console.log(`- ${row.name} in ${row.city_name}: ${row.count} times`);
      });
    } else {
      console.log('No duplicate barangays found.');
    }
    
    // Check all barangays
    console.log('\n=== ALL BARANGAYS ===');
    const allBarangays = await pool.query(`
      SELECT b.id, b.name, c.name as city_name 
      FROM barangays b 
      JOIN cities c ON b.city_id = c.id 
      ORDER BY c.name, b.name
    `);
    console.log(`Total barangays: ${allBarangays.rows.length}`);
    allBarangays.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Barangay: ${row.name}, City: ${row.city_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking address data:', error);
  } finally {
    pool.end();
  }
}

checkAddressData();