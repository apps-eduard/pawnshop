const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function checkSchema() {
  try {
    console.log('🔍 Checking pawn_tickets table schema...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pawn_tickets' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Pawn_tickets columns:');
    result.rows.forEach(row => {
      console.log('  -', row.column_name, '(' + row.data_type + ')', 
                  row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL',
                  row.column_default ? 'default: ' + row.column_default : '');
    });
    
    // Check if we have any test data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM pawn_tickets');
    console.log('\n📊 Total pawn_tickets:', countResult.rows[0].count);
    
    if (parseInt(countResult.rows[0].count) > 0) {
      const sampleResult = await pool.query('SELECT * FROM pawn_tickets ORDER BY created_at DESC LIMIT 3');
      console.log('\n📋 Latest tickets:');
      sampleResult.rows.forEach(row => {
        console.log('  -', row.ticket_number, '| Status:', row.status, '| Principal:', row.principal_amount, '| Created:', row.created_at);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();