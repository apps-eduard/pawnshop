const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

const fs = require('fs');
const path = require('path');

async function implementDatabaseChanges() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 IMPLEMENTING DATABASE SCHEMA CHANGES\n');
    
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'migrate-database-schema.sql');
    const migrationSQL = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📋 Executing migration script...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the changes
    console.log('🔍 VERIFYING UPDATED TABLE STRUCTURES:\n');
    
    // Check pawn_items structure
    console.log('🗂️  PAWN_ITEMS (Updated):');
    const pawnItemsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pawn_items' 
      ORDER BY ordinal_position;
    `);
    
    pawnItemsStructure.rows.forEach(col => {
      const required = col.is_nullable === 'NO' ? '(Required)' : '(Optional)';
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${required}`);
    });
    
    // Check categories structure
    console.log('\n📂 CATEGORIES (Updated):');
    const categoriesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      ORDER BY ordinal_position;
    `);
    
    categoriesStructure.rows.forEach(col => {
      const required = col.is_nullable === 'NO' ? '(Required)' : '(Optional)';
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${required}`);
    });
    
    // Check descriptions structure
    console.log('\n📝 DESCRIPTIONS (Updated):');
    const descriptionsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'descriptions' 
      ORDER BY ordinal_position;
    `);
    
    descriptionsStructure.rows.forEach(col => {
      const required = col.is_nullable === 'NO' ? '(Required)' : '(Optional)';
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${required}`);
    });
    
    // Check transactions structure
    console.log('\n💰 TRANSACTIONS (Updated):');
    const transactionsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position;
    `);
    
    transactionsStructure.rows.forEach(col => {
      const required = col.is_nullable === 'NO' ? '(Required)' : '(Optional)';
      console.log(`  ├─ ${col.column_name}: ${col.data_type} ${required}`);
    });
    
    // Test the updated API query
    console.log('\n🧪 TESTING UPDATED API QUERY:');
    try {
      const testQuery = await client.query(`
        SELECT 
          pi.*,
          cat.name as category_name,
          d.description_name,
          COALESCE(d.description_name, 'No description') as item_description
        FROM pawn_items pi
        LEFT JOIN categories cat ON pi.category_id = cat.id
        LEFT JOIN descriptions d ON pi.description_id = d.id
        LIMIT 1;
      `);
      
      if (testQuery.rows.length > 0) {
        const item = testQuery.rows[0];
        console.log('✅ Updated API Query Works:');
        console.log(`  ├─ Category: ${item.category_name}`);
        console.log(`  ├─ Description: ${item.description_name}`);
        console.log(`  ├─ Appraised Value: ₱${Number(item.appraised_value).toLocaleString()}`);
        console.log(`  └─ Status: ${item.status}`);
      }
    } catch (error) {
      console.log('❌ API Query Error:', error.message);
    }
    
    console.log('\n🎉 SCHEMA UPDATE COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    console.error('Rolling back transaction...');
    await client.query('ROLLBACK;');
  } finally {
    client.release();
    await pool.end();
  }
}

implementDatabaseChanges();