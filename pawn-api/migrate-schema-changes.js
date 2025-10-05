const { pool } = require('./config/database');

async function migrateSchemaChanges() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database schema migration...\n');
    
    await client.query('BEGIN');
    
    // =====================================================
    // 1. TRANSACTIONS TABLE CHANGES
    // =====================================================
    console.log('🔄 Modifying TRANSACTIONS table...');
    
    // Add granted_date column
    try {
      await client.query(`ALTER TABLE transactions ADD COLUMN granted_date DATE`);
      console.log('  ✅ Added granted_date column');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('  ℹ️  granted_date column already exists');
      } else {
        throw error;
      }
    }
    
    // Remove other_charges column
    try {
      await client.query(`ALTER TABLE transactions DROP COLUMN IF EXISTS other_charges`);
      console.log('  ✅ Removed other_charges column');
    } catch (error) {
      console.log('  ℹ️  other_charges column already removed or doesn\'t exist');
    }
    
    // Update granted_date with transaction_date for existing records
    const updateResult = await client.query(`
      UPDATE transactions 
      SET granted_date = transaction_date::DATE 
      WHERE granted_date IS NULL AND transaction_date IS NOT NULL
    `);
    console.log(`  ✅ Updated ${updateResult.rowCount} records with granted_date`);
    
    // =====================================================
    // 2. PAWN_ITEMS TABLE CHANGES
    // =====================================================
    console.log('\n🔄 Modifying PAWN_ITEMS table...');
    
    const columnsToRemove = [
      'custom_description', 'brand', 'model', 'serial_number', 
      'color', 'size_dimensions', 'weight', 'karat', 'metal_type', 
      'stone_type', 'stone_count', 'item_condition', 'defects', 
      'accessories', 'photo_urls'
    ];
    
    for (const column of columnsToRemove) {
      try {
        await client.query(`ALTER TABLE pawn_items DROP COLUMN IF EXISTS ${column}`);
        console.log(`  ✅ Removed ${column} column`);
      } catch (error) {
        console.log(`  ℹ️  ${column} column already removed or doesn't exist`);
      }
    }
    
    // =====================================================
    // 3. CATEGORIES TABLE CHANGES
    // =====================================================
    console.log('\n🔄 Modifying CATEGORIES table...');
    
    // Remove description column
    try {
      await client.query(`ALTER TABLE categories DROP COLUMN IF EXISTS description`);
      console.log('  ✅ Removed description column');
    } catch (error) {
      console.log('  ℹ️  description column already removed or doesn\'t exist');
    }
    
    // Add created_by and updated_by columns
    try {
      await client.query(`ALTER TABLE categories ADD COLUMN created_by INTEGER REFERENCES employees(id)`);
      console.log('  ✅ Added created_by column');
    } catch (error) {
      if (error.code === '42701') {
        console.log('  ℹ️  created_by column already exists');
      } else {
        throw error;
      }
    }
    
    try {
      await client.query(`ALTER TABLE categories ADD COLUMN updated_by INTEGER REFERENCES employees(id)`);
      console.log('  ✅ Added updated_by column');
    } catch (error) {
      if (error.code === '42701') {
        console.log('  ℹ️  updated_by column already exists');
      } else {
        throw error;
      }
    }
    
    // =====================================================
    // 4. DESCRIPTIONS TABLE CHANGES
    // =====================================================
    console.log('\n🔄 Modifying DESCRIPTIONS table...');
    
    // Check if 'name' column exists and rename to 'description_name'
    const nameColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'descriptions' AND column_name = 'name'
    `);
    
    if (nameColumnCheck.rows.length > 0) {
      await client.query(`ALTER TABLE descriptions RENAME COLUMN name TO description_name`);
      console.log('  ✅ Renamed name column to description_name');
    } else {
      console.log('  ℹ️  name column already renamed or doesn\'t exist');
    }
    
    // Remove description column
    try {
      await client.query(`ALTER TABLE descriptions DROP COLUMN IF EXISTS description`);
      console.log('  ✅ Removed description column');
    } catch (error) {
      console.log('  ℹ️  description column already removed or doesn\'t exist');
    }
    
    // =====================================================
    // 5. UPDATE EXISTING DATA
    // =====================================================
    console.log('\n🔄 Updating existing data...');
    
    // Set default values for new columns where appropriate
    const categoryUpdateResult = await client.query(`
      UPDATE categories 
      SET created_by = 1, updated_by = 1 
      WHERE created_by IS NULL
    `);
    console.log(`  ✅ Updated ${categoryUpdateResult.rowCount} category records with default user IDs`);
    
    await client.query('COMMIT');
    console.log('\n✅ Schema migration completed successfully!');
    
    // =====================================================
    // 6. VERIFICATION
    // =====================================================
    console.log('\n🔍 Verifying schema changes...\n');
    
    const tables = ['transactions', 'pawn_items', 'categories', 'descriptions'];
    
    for (const tableName of tables) {
      console.log(`📋 ${tableName.toUpperCase()} table schema:`);
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      result.rows.forEach(col => {
        console.log(`  ├─ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(Optional)' : '(Required)'}`);
      });
      console.log('');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit();
  }
}

// Run the migration
migrateSchemaChanges().catch(console.error);