const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function checkSchemas() {
  try {
    console.log('🔍 PAWNERS TABLE SCHEMA:');
    const pawnersResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      ORDER BY ordinal_position
    `);
    
    pawnersResult.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log('  -', row.column_name, row.data_type + length, 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL',
                  row.column_default ? 'default: ' + row.column_default : '');
    });
    
    console.log('\n🔍 PAWN_ITEMS TABLE SCHEMA:');
    const itemsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
      ORDER BY ordinal_position
    `);
    
    itemsResult.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log('  -', row.column_name, row.data_type + length, 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL',
                  row.column_default ? 'default: ' + row.column_default : '');
    });
    
    console.log('\n🔍 ADDRESS-RELATED TABLES:');
    console.log('CITIES:');
    const citiesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'cities' 
      ORDER BY ordinal_position
    `);
    
    citiesResult.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log('  -', row.column_name, row.data_type + length, 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL');
    });
    
    console.log('\nBARANGAYS:');
    const barangaysResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'barangays' 
      ORDER BY ordinal_position
    `);
    
    barangaysResult.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log('  -', row.column_name, row.data_type + length, 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL');
    });
    
    // Check sample data
    console.log('\n📊 SAMPLE DATA CHECK:');
    const pawnerCount = await pool.query('SELECT COUNT(*) as count FROM pawners');
    console.log('Pawners count:', pawnerCount.rows[0].count);
    
    const itemsCount = await pool.query('SELECT COUNT(*) as count FROM pawn_items');
    console.log('Pawn items count:', itemsCount.rows[0].count);
    
    const citiesCount = await pool.query('SELECT COUNT(*) as count FROM cities');
    console.log('Cities count:', citiesCount.rows[0].count);
    
    const barangaysCount = await pool.query('SELECT COUNT(*) as count FROM barangays');
    console.log('Barangays count:', barangaysCount.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchemas();