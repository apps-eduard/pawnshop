const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function createSimpleSampleAppraisals() {
  try {
    console.log('=== CREATING SIMPLIFIED SAMPLE APPRAISALS ===');
    
    // Ensure we have a pawner and appraiser
    let pawnerId, appraiserId;
    
    // Check for existing pawner
    const pawnerResult = await pool.query('SELECT id FROM pawners LIMIT 1');
    if (pawnerResult.rows.length === 0) {
      console.log('Creating sample pawner...');
      const newPawner = await pool.query(`
        INSERT INTO pawners (first_name, last_name, middle_name, mobile_number, email, 
                           birth_date, gender, civil_status, house_number, barangay, city, province)
        VALUES ('Juan', 'Dela Cruz', 'Santos', '09123456789', 'juan@email.com',
                '1985-01-15', 'Male', 'Single', '123', 'Barangay 1', 'Quezon City', 'Metro Manila')
        RETURNING id
      `);
      pawnerId = newPawner.rows[0].id;
    } else {
      pawnerId = pawnerResult.rows[0].id;
    }
    
    // Check for existing appraiser
    const appraiserResult = await pool.query('SELECT id FROM employees LIMIT 1');
    if (appraiserResult.rows.length === 0) {
      console.log('Creating sample appraiser...');
      const newAppraiser = await pool.query(`
        INSERT INTO employees (first_name, last_name, username, password_hash, role, mobile_number, email)
        VALUES ('Maria', 'Santos', 'appraiser1', '$2b$10$sample', 'appraiser', '09987654321', 'maria@email.com')
        RETURNING id
      `);
      appraiserId = newAppraiser.rows[0].id;
    } else {
      appraiserId = appraiserResult.rows[0].id;
    }
    
    // Create simplified sample appraisals - only category, description, notes
    const sampleAppraisals = [
      {
        category: 'Jewelry',
        description: '18k gold wedding ring with diamond setting',
        notes: 'Excellent condition, no scratches, original luster intact',
        estimatedValue: 25000,
        status: 'completed' // Ready for cashier to create loan
      },
      {
        category: 'Electronics',
        description: 'iPhone 13 Pro 256GB Space Gray',
        notes: 'Good working condition, minor wear on edges, all functions working',
        estimatedValue: 45000,
        status: 'completed'
      },
      {
        category: 'Jewelry',
        description: '22k gold chain necklace 20 inches',
        notes: 'Very good condition, authentic gold, heavy weight',
        estimatedValue: 65000,
        status: 'completed'
      },
      {
        category: 'Watch',
        description: 'Rolex Submariner automatic watch',
        notes: 'Excellent condition, with original box and papers, authentic',
        estimatedValue: 350000,
        status: 'pending' // Still being appraised
      },
      {
        category: 'Appliance',
        description: 'Samsung 55-inch 4K Smart TV',
        notes: 'Good condition, no dead pixels, remote included',
        estimatedValue: 35000,
        status: 'completed'
      }
    ];
    
    for (const appraisal of sampleAppraisals) {
      await pool.query(`
        INSERT INTO item_appraisals (
          pawner_id, appraiser_id, category, description, notes, estimated_value, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        pawnerId, appraiserId, appraisal.category, appraisal.description,
        appraisal.notes, appraisal.estimatedValue, appraisal.status
      ]);
    }
    
    console.log(`✅ Created ${sampleAppraisals.length} simplified item appraisals`);
    
    // Show the created data
    const result = await pool.query(`
      SELECT ia.*, p.first_name, p.last_name, e.first_name as appraiser_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      ORDER BY ia.created_at DESC
    `);
    
    console.log('\\n=== CREATED SIMPLIFIED APPRAISALS ===');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.category}: ${row.description}`);
      console.log(`   Value: ₱${row.estimated_value} (${row.status})`);
      console.log(`   Notes: ${row.notes}`);
      console.log(`   Pawner: ${row.first_name} ${row.last_name}`);
      console.log();
    });
    
    // Show completed appraisals (ready for cashier)
    const completedCount = result.rows.filter(row => row.status === 'completed').length;
    console.log(`🎯 ${completedCount} appraisals ready for cashier to create loans`);
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

createSimpleSampleAppraisals();