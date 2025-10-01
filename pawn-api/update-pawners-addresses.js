const { pool } = require('./config/database');

async function addAddressColumns() {
  try {
    console.log('🔧 Adding address columns to pawners table...');
    
    // Check if columns already exist
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      AND column_name IN ('city_id', 'barangay_id', 'address_details')
    `);
    
    const existingColumns = columns.rows.map(r => r.column_name);
    
    if (!existingColumns.includes('city_id')) {
      await pool.query('ALTER TABLE pawners ADD COLUMN city_id INTEGER REFERENCES cities(id)');
      console.log('✅ Added city_id column');
    }
    
    if (!existingColumns.includes('barangay_id')) {
      await pool.query('ALTER TABLE pawners ADD COLUMN barangay_id INTEGER REFERENCES barangays(id)');
      console.log('✅ Added barangay_id column');
    }
    
    if (!existingColumns.includes('address_details')) {
      await pool.query('ALTER TABLE pawners ADD COLUMN address_details TEXT');
      console.log('✅ Added address_details column');
    }
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pawners_city_id ON pawners(city_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pawners_barangay_id ON pawners(barangay_id)');
    
    console.log('✅ Address columns added successfully!');
    
    // Update existing pawners with sample city/barangay data
    console.log('🔄 Updating existing pawners with address data...');
    
    const existingPawners = await pool.query('SELECT id FROM pawners WHERE city_id IS NULL');
    const cities = await pool.query('SELECT id FROM cities LIMIT 5');
    const barangays = await pool.query('SELECT id, city_id FROM barangays LIMIT 10');
    
    for (let i = 0; i < existingPawners.rows.length && i < cities.rows.length; i++) {
      const pawnerId = existingPawners.rows[i].id;
      const cityId = cities.rows[i].id;
      const barangay = barangays.rows.find(b => b.city_id === cityId) || barangays.rows[0];
      
      await pool.query(`
        UPDATE pawners 
        SET city_id = $1, barangay_id = $2, address_details = $3 
        WHERE id = $4
      `, [cityId, barangay.id, `Sample address details for pawner ${pawnerId}`, pawnerId]);
    }
    
    console.log(`✅ Updated ${existingPawners.rows.length} existing pawners with address data`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error adding address columns:', error);
    await pool.end();
    process.exit(1);
  }
}

addAddressColumns();