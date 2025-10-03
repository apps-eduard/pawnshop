const { pool } = require('./config/database');

async function fixPawnerAddresses() {
  const client = await pool.connect();
  
  try {
    console.log('🏠 Fixing pawner address data...');
    
    await client.query('BEGIN');
    
    // First, ensure we have some cities and barangays
    const cities = await client.query('SELECT id, name FROM cities LIMIT 3');
    console.log(`Found ${cities.rows.length} cities`);
    
    if (cities.rows.length === 0) {
      console.log('Creating sample cities and barangays...');
      
      // Create sample cities
      const cityResult1 = await client.query(`
        INSERT INTO cities (name, is_active) VALUES ('Manila', true) RETURNING id
      `);
      const cityResult2 = await client.query(`
        INSERT INTO cities (name, is_active) VALUES ('Quezon City', true) RETURNING id
      `);
      const cityResult3 = await client.query(`
        INSERT INTO cities (name, is_active) VALUES ('Makati', true) RETURNING id
      `);
      
      // Create sample barangays
      const manilaBarangays = ['Ermita', 'Malate', 'Binondo'];
      const qcBarangays = ['Diliman', 'Cubao', 'Commonwealth'];
      const makatiBarangays = ['Poblacion', 'Legazpi Village', 'Salcedo Village'];
      
      for (const barangay of manilaBarangays) {
        await client.query(`
          INSERT INTO barangays (name, city_id, is_active) VALUES ($1, $2, true)
        `, [barangay, cityResult1.rows[0].id]);
      }
      
      for (const barangay of qcBarangays) {
        await client.query(`
          INSERT INTO barangays (name, city_id, is_active) VALUES ($1, $2, true)
        `, [barangay, cityResult2.rows[0].id]);
      }
      
      for (const barangay of makatiBarangays) {
        await client.query(`
          INSERT INTO barangays (name, city_id, is_active) VALUES ($1, $2, true)
        `, [barangay, cityResult3.rows[0].id]);
      }
      
      console.log('✅ Created sample cities and barangays');
    }
    
    // Get updated cities and barangays
    const allCities = await client.query('SELECT id, name FROM cities WHERE is_active = true');
    
    // Get pawners without address info
    const pawnersResult = await client.query(`
      SELECT id, first_name, last_name 
      FROM pawners 
      WHERE city_id IS NULL OR barangay_id IS NULL OR address_details IS NULL
    `);
    
    console.log(`Found ${pawnersResult.rows.length} pawners with incomplete address data`);
    
    for (let i = 0; i < pawnersResult.rows.length; i++) {
      const pawner = pawnersResult.rows[i];
      const city = allCities.rows[i % allCities.rows.length];
      
      // Get a barangay for this city
      const barangayResult = await client.query(`
        SELECT id, name FROM barangays WHERE city_id = $1 AND is_active = true LIMIT 1
      `, [city.id]);
      
      if (barangayResult.rows.length > 0) {
        const barangay = barangayResult.rows[0];
        
        // Update pawner with address info
        await client.query(`
          UPDATE pawners 
          SET city_id = $1, 
              barangay_id = $2, 
              address_details = $3
          WHERE id = $4
        `, [
          city.id,
          barangay.id,
          `${Math.floor(Math.random() * 999) + 1} ${['Main Street', 'Oak Avenue', 'Pine Road', 'Elm Drive', 'Maple Lane'][Math.floor(Math.random() * 5)]}, Unit ${Math.floor(Math.random() * 50) + 1}`,
          pawner.id
        ]);
        
        console.log(`✅ Updated ${pawner.first_name} ${pawner.last_name} - ${city.name}, ${barangay.name}`);
      }
    }
    
    // Fix expiry dates for active transactions
    const activeTransactions = await client.query(`
      SELECT id, ticket_number, maturity_date 
      FROM pawn_tickets 
      WHERE status = 'active' AND expiry_date IS NULL
    `);
    
    console.log(`Found ${activeTransactions.rows.length} transactions without expiry dates`);
    
    for (const transaction of activeTransactions.rows) {
      const maturityDate = new Date(transaction.maturity_date);
      const expiryDate = new Date(maturityDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after maturity
      
      await client.query(`
        UPDATE pawn_tickets 
        SET expiry_date = $1 
        WHERE id = $2
      `, [expiryDate, transaction.id]);
      
      console.log(`✅ Added expiry date for ${transaction.ticket_number}`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 Address data fixed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing address data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixPawnerAddresses();
    process.exit(0);
  } catch (error) {
    console.error('Failed to fix address data:', error);
    process.exit(1);
  }
}

main();