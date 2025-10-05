const { pool } = require('./config/database');

async function showAllTables() {
  try {
    console.log('📊 All Tables in Database:\n');
    
    // Get all tables with row counts
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in database');
      return;
    }
    
    console.log(`✅ Found ${tablesResult.rows.length} tables:\n`);
    
    // Get row count for each table
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName};`);
        const rowCount = countResult.rows[0].count;
        console.log(`📋 ${tableName.padEnd(25)} - ${rowCount} rows`);
      } catch (error) {
        console.log(`📋 ${tableName.padEnd(25)} - Error counting rows`);
      }
    }
    
    // Show table relationships/foreign keys
    console.log('\n🔗 Table Relationships (Foreign Keys):');
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
      ORDER BY tc.table_name, kcu.column_name;
    `);
    
    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach(row => {
        console.log(`  ├─ ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('  └─ No foreign key relationships found');
    }
    
    // Show main business tables summary
    console.log('\n📈 Main Business Tables Summary:');
    const businessTables = [
      'employees', 'pawners', 'branches', 'categories', 'descriptions',
      'pawn_items', 'transactions', 'pawn_tickets', 'item_appraisals',
      'cities', 'barangays', 'audit_logs'
    ];
    
    for (const tableName of businessTables) {
      try {
        const exists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          );
        `, [tableName]);
        
        if (exists.rows[0].exists) {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName};`);
          const rowCount = countResult.rows[0].count;
          console.log(`  ✅ ${tableName.padEnd(20)} - ${rowCount} records`);
        } else {
          console.log(`  ❌ ${tableName.padEnd(20)} - Table not found`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${tableName.padEnd(20)} - Error checking table`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

showAllTables();