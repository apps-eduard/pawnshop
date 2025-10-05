const { pool } = require('./config/database');

async function showCurrentAppraisals() {
  try {
    console.log('📋 Current Appraisals in Database:\n');
    
    const result = await pool.query(`
      SELECT 
        ia.id,
        ia.category,
        ia.status,
        ia.estimated_value,
        LEFT(ia.description, 40) || '...' as short_description,
        TO_CHAR(ia.created_at, 'YYYY-MM-DD HH24:MI') as created,
        p.first_name || ' ' || p.last_name as pawner_name,
        CASE 
          WHEN ia.appraiser_id IS NOT NULL THEN e.first_name || ' ' || e.last_name
          ELSE 'Not Assigned'
        END as appraiser_name
      FROM item_appraisals ia
      LEFT JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      ORDER BY ia.created_at DESC;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No appraisals found in database');
      return;
    }
    
    console.log('┌────┬────────────┬────────┬──────────┬─────────────────────┬─────────────────┬─────────────────┐');
    console.log('│ ID │ Category   │ Status │ Value    │ Description         │ Pawner          │ Appraiser       │');
    console.log('├────┼────────────┼────────┼──────────┼─────────────────────┼─────────────────┼─────────────────┤');
    
    result.rows.forEach(row => {
      const id = String(row.id).padEnd(2);
      const category = String(row.category).padEnd(10);
      const status = String(row.status).padEnd(6);
      const value = ('₱' + Number(row.estimated_value).toLocaleString()).padEnd(8);
      const description = String(row.short_description).padEnd(19);
      const pawner = String(row.pawner_name || 'Unknown').padEnd(15);
      const appraiser = String(row.appraiser_name).padEnd(15);
      
      console.log(`│ ${id} │ ${category} │ ${status} │ ${value} │ ${description} │ ${pawner} │ ${appraiser} │`);
    });
    
    console.log('└────┴────────────┴────────┴──────────┴─────────────────────┴─────────────────┴─────────────────┘');
    
    // Summary
    const summary = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM item_appraisals 
      GROUP BY status
      ORDER BY status;
    `);
    
    console.log('\n📊 Summary:');
    summary.rows.forEach(row => {
      console.log(`  ├─ ${row.status.toUpperCase()}: ${row.count} appraisals (Total: ₱${Number(row.total_value).toLocaleString()})`);
    });
    
    const totalCount = await pool.query('SELECT COUNT(*) as total FROM item_appraisals;');
    const totalValue = await pool.query('SELECT SUM(estimated_value) as total FROM item_appraisals;');
    
    console.log(`  └─ TOTAL: ${totalCount.rows[0].total} appraisals (Total: ₱${Number(totalValue.rows[0].total).toLocaleString()})`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

showCurrentAppraisals();