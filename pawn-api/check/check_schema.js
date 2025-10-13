const pool = require('../config/database');

async function checkSchema() {
  try {
    // Check pawners columns
    const pawnerCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      AND column_name IN ('address_id', 'house_number', 'street', 'city_id', 'barangay_id')
      ORDER BY column_name
    `);
    console.log('Pawner columns:', pawnerCols.rows.map(r => r.column_name).join(', '));
    
    // Check if addresses table exists
    const addressesTable = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses'
      ORDER BY ordinal_position
    `);
    
    if (addressesTable.rows.length > 0) {
      console.log('Addresses table columns:', addressesTable.rows.map(r => r.column_name).join(', '));
    } else {
      console.log('Addresses table: NOT EXISTS');
    }
    
    // Check employees columns
    const employeeCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('address_id', 'address')
      ORDER BY column_name
    `);
    console.log('Employee columns:', employeeCols.rows.map(r => r.column_name).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
