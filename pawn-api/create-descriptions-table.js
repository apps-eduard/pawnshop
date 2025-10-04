const { pool } = require('./config/database');
const fs = require('fs');

async function createDescriptionsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating descriptions table with updated structure...');
    
    await client.query('BEGIN');
    
    // Read and execute the migration SQL
    const sql = fs.readFileSync('./migrations/create_descriptions_table.sql', 'utf8');
    await client.query(sql);
    
    await client.query('COMMIT');
    console.log('✅ Descriptions table created successfully');
    
    // Verify the new structure
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'descriptions' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Descriptions table structure:');
    columns.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type})`);
    });
    
    // Count the seeded descriptions by category
    const descriptionCounts = await client.query(`
      SELECT c.name as category, COUNT(d.id) as description_count
      FROM categories c
      LEFT JOIN descriptions d ON c.id = d.category_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    
    console.log('📝 Descriptions count by category:');
    descriptionCounts.rows.forEach(cat => {
      console.log(`   • ${cat.category}: ${cat.description_count} descriptions`);
    });
    
    // Show some sample descriptions
    const sampleDescriptions = await client.query(`
      SELECT c.name as category, d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      ORDER BY c.name, d.notes
      LIMIT 10
    `);
    
    console.log('📋 Sample descriptions/notes:');
    sampleDescriptions.rows.forEach(desc => {
      console.log(`   • ${desc.category}: ${desc.notes}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating descriptions table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createDescriptionsTable();
    process.exit(0);
  } catch (error) {
    console.error('Failed to create descriptions table:', error);
    process.exit(1);
  }
}

main();