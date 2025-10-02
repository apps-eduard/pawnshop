const { pool } = require('./config/database');

async function cleanDuplicateData() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Cleaning duplicate address data...\n');
    
    await client.query('BEGIN');
    
    // Clean duplicate barangays first (because they reference cities)
    console.log('=== CLEANING DUPLICATE BARANGAYS ===');
    
    // Get all barangays grouped by name and city
    const duplicateBarangays = await client.query(`
      SELECT b.name, b.city_id, c.name as city_name, 
             array_agg(b.id ORDER BY b.id) as ids
      FROM barangays b 
      JOIN cities c ON b.city_id = c.id
      GROUP BY b.name, b.city_id, c.name
      HAVING COUNT(*) > 1
      ORDER BY c.name, b.name
    `);
    
    for (const row of duplicateBarangays.rows) {
      const idsToDelete = row.ids.slice(1); // Keep the first one, delete the rest
      console.log(`Cleaning "${row.name}" in ${row.city_name}: keeping ID ${row.ids[0]}, deleting IDs [${idsToDelete.join(', ')}]`);
      
      if (idsToDelete.length > 0) {
        await client.query('DELETE FROM barangays WHERE id = ANY($1)', [idsToDelete]);
      }
    }
    
    console.log(`✅ Cleaned ${duplicateBarangays.rows.length} duplicate barangay entries\n`);
    
    // Clean duplicate cities
    console.log('=== CLEANING DUPLICATE CITIES ===');
    
    // Get all cities grouped by lowercase name
    const duplicateCities = await client.query(`
      SELECT LOWER(name) as lower_name, 
             array_agg(id ORDER BY id) as ids,
             array_agg(name ORDER BY id) as names
      FROM cities 
      GROUP BY LOWER(name)
      HAVING COUNT(*) > 1
      ORDER BY LOWER(name)
    `);
    
    for (const row of duplicateCities.rows) {
      const idsToDelete = row.ids.slice(1); // Keep the first one, delete the rest
      console.log(`Cleaning "${row.names[0]}": keeping ID ${row.ids[0]}, deleting IDs [${idsToDelete.join(', ')}]`);
      
      if (idsToDelete.length > 0) {
        // First, update any barangays that reference the cities we're about to delete
        await client.query(`
          UPDATE barangays 
          SET city_id = $1 
          WHERE city_id = ANY($2)
        `, [row.ids[0], idsToDelete]);
        
        // Then delete the duplicate cities
        await client.query('DELETE FROM cities WHERE id = ANY($1)', [idsToDelete]);
      }
    }
    
    console.log(`✅ Cleaned ${duplicateCities.rows.length} duplicate city entries\n`);
    
    await client.query('COMMIT');
    
    // Verify cleanup
    console.log('=== VERIFICATION ===');
    const remainingCities = await client.query('SELECT COUNT(*) FROM cities');
    const remainingBarangays = await client.query('SELECT COUNT(*) FROM barangays');
    
    console.log(`Final count: ${remainingCities.rows[0].count} cities, ${remainingBarangays.rows[0].count} barangays`);
    
    console.log('🎉 Duplicate cleanup completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning duplicate data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanDuplicateData()
    .then(() => {
      console.log('🏁 Cleanup process completed');
      pool.end();
    })
    .catch((error) => {
      console.error('💥 Cleanup process failed:', error);
      pool.end();
      process.exit(1);
    });
}