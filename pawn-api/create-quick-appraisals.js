const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function createSimpleAppraisals() {
  try {
    console.log('=== CREATING SIMPLE SAMPLE APPRAISALS ===');
    
    // Check pawners table structure first
    console.log('Checking pawners table...');
    const pawnerStructure = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pawners' LIMIT 5
    `);
    console.log('Pawner columns:', pawnerStructure.rows.map(r => r.column_name));
    
    // Get existing pawner or use ID 1
    let pawnerId = 1;
    const pawnerCheck = await pool.query('SELECT id FROM pawners LIMIT 1');
    if (pawnerCheck.rows.length > 0) {
      pawnerId = pawnerCheck.rows[0].id;
      console.log('Using existing pawner ID:', pawnerId);
    } else {
      console.log('No pawners found, trying to create simple one...');
      try {
        const newPawner = await pool.query(`
          INSERT INTO pawners (first_name, last_name, mobile_number) 
          VALUES ('Juan', 'Cruz', '09123456789') RETURNING id
        `);
        pawnerId = newPawner.rows[0].id;
        console.log('Created pawner ID:', pawnerId);
      } catch (err) {
        console.log('Could not create pawner, using ID 1:', err.message);
      }
    }
    
    // Get existing employee or use ID 1  
    let appraiserId = 1;
    const empCheck = await pool.query('SELECT id FROM employees LIMIT 1');
    if (empCheck.rows.length > 0) {
      appraiserId = empCheck.rows[0].id;
      console.log('Using existing employee ID:', appraiserId);
    }
    
    // Create simple appraisals
    const appraisals = [
      {
        category: 'Jewelry',
        description: 'Gold ring',
        notes: 'Good condition',
        estimatedValue: 15000,
        status: 'completed'
      },
      {
        category: 'Electronics', 
        description: 'Smartphone',
        notes: 'Working condition',
        estimatedValue: 25000,
        status: 'completed'
      }
    ];
    
    for (const item of appraisals) {
      await pool.query(`
        INSERT INTO item_appraisals (pawner_id, appraiser_id, category, description, notes, estimated_value, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [pawnerId, appraiserId, item.category, item.description, item.notes, item.estimatedValue, item.status]);
    }
    
    console.log('✅ Created sample appraisals');
    
    // Verify
    const count = await pool.query('SELECT COUNT(*) FROM item_appraisals');
    console.log('Total appraisals:', count.rows[0].count);
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

createSimpleAppraisals();