const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432
});

async function checkItemDetailsTables() {
  try {
    console.log('🔍 CHECKING ACTUAL DATABASE - ITEM DETAILS TABLES\n');
    
    // Check which tables exist
    console.log('📋 EXISTING TABLES:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pawn_items', 'categories', 'descriptions', 'transactions', 'pawn_tickets')
      ORDER BY table_name;
    `);
    
    if (tables.rows.length === 0) {
      console.log('❌ No item-related tables found');
      return;
    }
    
    tables.rows.forEach(table => {
      console.log(`  ✅ ${table.table_name}`);
    });
    
    // Check each table structure and data
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      console.log(`\n🗂️  TABLE: ${tableName.toUpperCase()}`);
      console.log('─'.repeat(50));
      
      // Get table structure
      const structure = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          character_maximum_length,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [tableName]);
      
      console.log('📋 COLUMNS:');
      structure.rows.forEach(col => {
        const nullable = col.is_nullable === 'NO' ? '(Required)' : '(Optional)';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`  ├─ ${col.column_name}: ${col.data_type}${length} ${nullable}`);
      });
      
      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      const count = parseInt(countResult.rows[0].count);
      console.log(`\n📊 RECORDS: ${count} rows`);
      
      // Show sample data
      if (count > 0) {
        console.log('📄 SAMPLE DATA:');
        const sampleData = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
        sampleData.rows.forEach((row, index) => {
          console.log(`\n  ${index + 1}. Record:`);
          Object.keys(row).forEach(key => {
            let value = row[key];
            if (value === null) value = 'NULL';
            if (typeof value === 'string' && value.length > 50) {
              value = value.substring(0, 50) + '...';
            }
            console.log(`     ${key}: ${value}`);
          });
        });
      }
    }
    
    // Check relationships
    console.log('\n🔗 FOREIGN KEY RELATIONSHIPS:');
    const relationships = await pool.query(`
      SELECT 
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('pawn_items', 'categories', 'descriptions', 'transactions', 'pawn_tickets')
      ORDER BY tc.table_name;
    `);
    
    if (relationships.rows.length > 0) {
      relationships.rows.forEach(rel => {
        console.log(`  ├─ ${rel.source_table}.${rel.source_column} → ${rel.target_table}.${rel.target_column}`);
      });
    } else {
      console.log('  ❌ No foreign key relationships found');
    }
    
    // Test the actual query used in the API
    console.log('\n🧪 TESTING ACTUAL API QUERY:');
    try {
      const testQuery = await pool.query(`
        SELECT pi.*,
               cat.name as category_name,
               cat.description as category_description, 
               d.name as description_name,
               d.description as description_detail,
               COALESCE(pi.custom_description, d.name) as item_description
        FROM pawn_items pi
        LEFT JOIN categories cat ON pi.category_id = cat.id
        LEFT JOIN descriptions d ON pi.description_id = d.id
        LIMIT 1;
      `);
      
      if (testQuery.rows.length > 0) {
        console.log('✅ API Query Works - Sample Result:');
        const item = testQuery.rows[0];
        console.log(`  Category: ${item.category_name}`);
        console.log(`  Description: ${item.description_name}`);
        console.log(`  Custom Description: ${item.custom_description}`);
        console.log(`  Appraised Value: ${item.appraised_value}`);
      }
    } catch (error) {
      console.log('❌ API Query Failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkItemDetailsTables();