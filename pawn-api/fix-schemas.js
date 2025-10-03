const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function fixSchemas() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting schema fixes...');
    
    await client.query('BEGIN');
    
    // 1. FIX PAWNERS TABLE - Add missing address fields
    console.log('\n📋 FIXING PAWNERS TABLE:');
    
    const pawnerAlterations = [
      'ALTER TABLE pawners ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id)',
      'ALTER TABLE pawners ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id)',
      'ALTER TABLE pawners ADD COLUMN IF NOT EXISTS address_details TEXT'
    ];
    
    for (const query of pawnerAlterations) {
      try {
        await client.query(query);
        const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Added column:', columnName);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
          console.log('⚠️ Column exists:', columnName);
        } else {
          console.log('❌ Error:', err.message);
        }
      }
    }
    
    // 2. FIX PAWN_ITEMS TABLE - Add missing fields and rename columns
    console.log('\n📋 FIXING PAWN_ITEMS TABLE:');
    
    const itemAlterations = [
      'ALTER TABLE pawn_items ADD COLUMN IF NOT EXISTS category VARCHAR(100)',
      'ALTER TABLE pawn_items ADD COLUMN IF NOT EXISTS category_description VARCHAR(255)',
      'ALTER TABLE pawn_items ADD COLUMN IF NOT EXISTS appraisal_value DECIMAL(12,2)'
    ];
    
    for (const query of itemAlterations) {
      try {
        await client.query(query);
        const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Added column:', columnName);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const columnName = query.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1];
          console.log('⚠️ Column exists:', columnName);
        } else {
          console.log('❌ Error:', err.message);
        }
      }
    }
    
    // 3. DATA MIGRATION - Copy existing data to new fields
    console.log('\n📋 MIGRATING DATA:');
    
    // Copy item_type to category if category is empty and item_type exists
    try {
      const updateResult = await client.query(`
        UPDATE pawn_items 
        SET category = item_type, 
            appraisal_value = estimated_value
        WHERE category IS NULL OR category = ''
      `);
      console.log('✅ Migrated', updateResult.rowCount, 'pawn_items to new schema');
    } catch (err) {
      console.log('⚠️ Migration note:', err.message);
    }
    
    // 4. ADD INDEXES for performance
    console.log('\n📋 ADDING INDEXES:');
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_pawners_city_id ON pawners(city_id)',
      'CREATE INDEX IF NOT EXISTS idx_pawners_barangay_id ON pawners(barangay_id)',
      'CREATE INDEX IF NOT EXISTS idx_pawn_items_category ON pawn_items(category)',
      'CREATE INDEX IF NOT EXISTS idx_pawn_items_ticket_id ON pawn_items(ticket_id)'
    ];
    
    for (const query of indexQueries) {
      try {
        await client.query(query);
        const indexName = query.split('CREATE INDEX IF NOT EXISTS')[1]?.split(' ')[1];
        console.log('✅ Created index:', indexName);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const indexName = query.split('CREATE INDEX IF NOT EXISTS')[1]?.split(' ')[1];
          console.log('⚠️ Index exists:', indexName);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 Schema fixes completed successfully!');
    
    // 5. VERIFY FIXES
    console.log('\n🔍 VERIFYING FIXES:');
    
    const pawnersCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pawners' AND column_name IN ('city_id', 'barangay_id', 'address_details')
    `);
    
    const itemsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pawn_items' AND column_name IN ('category', 'category_description', 'appraisal_value')
    `);
    
    console.log('✅ Pawners table has', pawnersCheck.rows.length, 'new address columns');
    console.log('✅ Pawn_items table has', itemsCheck.rows.length, 'new item columns');
    
    // Check sample data
    const sampleItems = await client.query('SELECT id, category, category_description, appraisal_value FROM pawn_items LIMIT 3');
    if (sampleItems.rows.length > 0) {
      console.log('📋 Sample pawn_items data:');
      sampleItems.rows.forEach(row => {
        console.log('  -', row.id, '|', row.category, '|', row.category_description, '|', row.appraisal_value);
      });
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing schemas:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchemas();