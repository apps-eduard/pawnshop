const { pool } = require('./config/database');

async function showTableCounts() {
  try {
    console.log('📊 Database Tables with Row Counts:\n');
    
    const importantTables = [
      'employees', 'pawners', 'branches', 'categories', 'descriptions',
      'pawn_items', 'transactions', 'pawn_tickets', 'item_appraisals',
      'cities', 'barangays', 'audit_logs', 'appraisals'
    ];
    
    for (const tableName of importantTables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName};`);
        const count = result.rows[0].count;
        console.log(`📋 ${tableName.padEnd(20)} - ${count.toString().padStart(4)} rows`);
      } catch (error) {
        console.log(`❌ ${tableName.padEnd(20)} - Table not found or error`);
      }
    }
    
    console.log('\n🎯 Key Data Summary:');
    
    // Check categories
    try {
      const categories = await pool.query('SELECT name FROM categories ORDER BY name;');
      console.log(`  ├─ Categories: ${categories.rows.map(r => r.name).join(', ')}`);
    } catch (e) {
      console.log('  ├─ Categories: Error loading');
    }
    
    // Check employees by role
    try {
      const roles = await pool.query('SELECT role, COUNT(*) as count FROM employees GROUP BY role ORDER BY role;');
      console.log('  ├─ Employee Roles:');
      roles.rows.forEach(r => {
        console.log(`  │   └─ ${r.role}: ${r.count} employees`);
      });
    } catch (e) {
      console.log('  ├─ Employee Roles: Error loading');
    }
    
    // Check item_appraisals status
    try {
      const appraisalStatus = await pool.query('SELECT status, COUNT(*) as count FROM item_appraisals GROUP BY status ORDER BY status;');
      console.log('  └─ Appraisals Status:');
      appraisalStatus.rows.forEach(r => {
        console.log(`      └─ ${r.status}: ${r.count} appraisals`);
      });
    } catch (e) {
      console.log('  └─ Appraisals Status: Error loading');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

showTableCounts();