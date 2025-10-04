const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function addMoreSampleAppraisals() {
  try {
    console.log('=== ADDING MORE SAMPLE APPRAISALS FOR CASHIER DASHBOARD ===');
    
    // Get existing pawner and appraiser IDs
    const pawner = await pool.query('SELECT id FROM pawners LIMIT 1');
    const appraiser = await pool.query('SELECT id FROM employees LIMIT 1');
    
    const pawnerId = pawner.rows[0].id;
    const appraiserId = appraiser.rows[0].id;
    
    // Add one more completed appraisal to make it 3 total
    const newAppraisal = {
      category: 'Watch',
      description: 'Luxury wristwatch with leather strap',
      notes: 'Excellent condition, authentic, working perfectly',
      estimatedValue: 75000,
      status: 'completed' // This will appear in cashier dashboard
    };
    
    await pool.query(`
      INSERT INTO item_appraisals (pawner_id, appraiser_id, category, description, notes, estimated_value, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [pawnerId, appraiserId, newAppraisal.category, newAppraisal.description, newAppraisal.notes, newAppraisal.estimatedValue, newAppraisal.status]);
    
    console.log('✅ Added 1 more completed appraisal');
    
    // Show all completed appraisals (what cashier will see)
    const result = await pool.query(`
      SELECT ia.id, ia.pawner_id, ia.category, ia.description, ia.estimated_value,
             ia.status, ia.created_at, ia.notes,
             p.first_name, p.last_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      WHERE ia.status = 'completed'
      ORDER BY ia.created_at DESC
    `);
    
    console.log(`\n=== CASHIER DASHBOARD WILL SHOW ${result.rows.length} PENDING APPRAISALS ===`);
    
    result.rows.forEach((row, index) => {
      const pawnerName = `${row.first_name} ${row.last_name}`;
      const itemType = row.description;
      const totalValue = parseFloat(row.estimated_value);
      
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Pawner: ${pawnerName}`);
      console.log(`   Item: ${row.category} - ${itemType}`);
      console.log(`   Value: ₱${totalValue.toLocaleString()}`);
      console.log(`   Notes: ${row.notes}`);
      console.log('   ─────────────────────────────');
    });
    
    console.log(`\n🎯 ${result.rows.length} completed appraisals ready for cashier to create loans!`);
    console.log('📊 These will appear as "Pending Appraisals" in the cashier dashboard');
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

addMoreSampleAppraisals();