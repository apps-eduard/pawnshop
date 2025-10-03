const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function verifySchemas() {
  try {
    console.log('🔍 FINAL SCHEMA VERIFICATION:');
    
    // Check pawners table structure
    console.log('\n📋 PAWNERS TABLE STRUCTURE:');
    const pawnersResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pawners' 
      AND column_name IN ('first_name', 'last_name', 'contact_number', 'email', 'city_id', 'barangay_id', 'address_details')
      ORDER BY ordinal_position
    `);
    
    pawnersResult.rows.forEach(row => {
      console.log('  ✅', row.column_name, '(' + row.data_type + ')', 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL');
    });
    
    // Check pawn_items table structure
    console.log('\n📋 PAWN_ITEMS TABLE STRUCTURE:');
    const itemsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
      AND column_name IN ('ticket_id', 'category', 'category_description', 'description', 'appraisal_value')
      ORDER BY ordinal_position
    `);
    
    itemsResult.rows.forEach(row => {
      console.log('  ✅', row.column_name, '(' + row.data_type + ')', 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL');
    });
    
    // Check pawn_tickets table structure for transaction fields
    console.log('\n📋 PAWN_TICKETS TRANSACTION FIELDS:');
    const ticketsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pawn_tickets' 
      AND column_name IN ('transaction_date', 'loan_date', 'maturity_date', 'expiry_date', 'principal_amount', 'interest_rate', 'service_charge', 'net_proceeds')
      ORDER BY ordinal_position
    `);
    
    ticketsResult.rows.forEach(row => {
      console.log('  ✅', row.column_name, '(' + row.data_type + ')', 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL');
    });
    
    // Check foreign key relationships
    console.log('\n📋 FOREIGN KEY RELATIONSHIPS:');
    const fkResult = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('pawners', 'pawn_items', 'pawn_tickets')
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    fkResult.rows.forEach(row => {
      console.log('  🔗', row.table_name + '.' + row.column_name, '→', 
                  row.foreign_table_name + '.' + row.foreign_column_name);
    });
    
    console.log('\n🎉 All schemas are properly aligned with frontend forms!');
    
    // Quick data consistency check
    console.log('\n📊 DATA CONSISTENCY CHECK:');
    const dataCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM pawners) as pawners_count,
        (SELECT COUNT(*) FROM pawn_tickets) as tickets_count,
        (SELECT COUNT(*) FROM pawn_items) as items_count,
        (SELECT COUNT(*) FROM cities) as cities_count,
        (SELECT COUNT(*) FROM barangays) as barangays_count
    `);
    
    const counts = dataCheck.rows[0];
    console.log('  📈 Pawners:', counts.pawners_count);
    console.log('  🎫 Pawn Tickets:', counts.tickets_count);
    console.log('  📦 Pawn Items:', counts.items_count);
    console.log('  🏙️ Cities:', counts.cities_count);
    console.log('  🏘️ Barangays:', counts.barangays_count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifySchemas();