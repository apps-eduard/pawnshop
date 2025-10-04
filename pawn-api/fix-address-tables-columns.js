const { pool } = require('./config/database');

async function fixAddressTablesColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing cities and barangays table columns...');
    
    await client.query('BEGIN');
    
    // Check if updated_at column exists in cities table
    const citiesColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cities' AND column_name = 'updated_at'
    `);
    
    if (citiesColumnsResult.rows.length === 0) {
      console.log('📍 Adding updated_at column to cities table...');
      await client.query(`
        ALTER TABLE cities 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      
      // Update existing rows to have current timestamp
      await client.query(`
        UPDATE cities 
        SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) 
        WHERE updated_at IS NULL
      `);
      
      // Create trigger for auto-updating updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_cities_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS update_cities_timestamp ON cities;
        CREATE TRIGGER update_cities_timestamp 
            BEFORE UPDATE ON cities 
            FOR EACH ROW 
            EXECUTE FUNCTION update_cities_updated_at()
      `);
      
      console.log('✅ Added updated_at column to cities table');
    } else {
      console.log('ℹ️  Cities table already has updated_at column');
    }
    
    // Check if updated_at column exists in barangays table
    const barangaysColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'barangays' AND column_name = 'updated_at'
    `);
    
    if (barangaysColumnsResult.rows.length === 0) {
      console.log('🏘️ Adding updated_at column to barangays table...');
      await client.query(`
        ALTER TABLE barangays 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      
      // Update existing rows to have current timestamp
      await client.query(`
        UPDATE barangays 
        SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) 
        WHERE updated_at IS NULL
      `);
      
      // Create trigger for auto-updating updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_barangays_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      
      await client.query(`
        DROP TRIGGER IF EXISTS update_barangays_timestamp ON barangays;
        CREATE TRIGGER update_barangays_timestamp 
            BEFORE UPDATE ON barangays 
            FOR EACH ROW 
            EXECUTE FUNCTION update_barangays_updated_at()
      `);
      
      console.log('✅ Added updated_at column to barangays table');
    } else {
      console.log('ℹ️  Barangays table already has updated_at column');
    }
    
    await client.query('COMMIT');
    console.log('🎉 Address tables columns fixed successfully!');
    
    // Verify the changes
    const citiesFinal = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cities' 
      ORDER BY ordinal_position
    `);
    
    const barangaysFinal = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'barangays' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Final cities table structure:', citiesFinal.rows.map(r => r.column_name).join(', '));
    console.log('📊 Final barangays table structure:', barangaysFinal.rows.map(r => r.column_name).join(', '));
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing address tables columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixAddressTablesColumns();
    process.exit(0);
  } catch (error) {
    console.error('Failed to fix address tables columns:', error);
    process.exit(1);
  }
}

main();