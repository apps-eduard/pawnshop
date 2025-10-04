const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pawnshop_db',
  user: 'postgres',
  password: '123'
});

async function createSampleAppraisals() {
  try {
    console.log('=== CREATING SAMPLE ITEM APPRAISALS ===');
    
    // First check if we have pawners and employees
    const pawnersCount = await pool.query('SELECT COUNT(*) FROM pawners');
    const employeesCount = await pool.query('SELECT COUNT(*) FROM employees');
    
    console.log(`Pawners: ${pawnersCount.rows[0].count}, Employees: ${employeesCount.rows[0].count}`);
    
    if (parseInt(pawnersCount.rows[0].count) === 0) {
      console.log('No pawners found, creating sample pawner...');
      await pool.query(`
        INSERT INTO pawners (first_name, last_name, middle_name, mobile_number, email, 
                           birth_date, gender, civil_status, house_number, barangay, city, province)
        VALUES ('Juan', 'Dela Cruz', 'Santos', '09123456789', 'juan@email.com',
                '1985-01-15', 'Male', 'Single', '123', 'Barangay 1', 'Quezon City', 'Metro Manila')
      `);
      console.log('✅ Sample pawner created');
    }
    
    if (parseInt(employeesCount.rows[0].count) === 0) {
      console.log('No employees found, creating sample appraiser...');
      await pool.query(`
        INSERT INTO employees (first_name, last_name, username, password_hash, role, mobile_number, email)
        VALUES ('Maria', 'Santos', 'appraiser1', '$2b$10$sample', 'appraiser', '09987654321', 'maria@email.com')
      `);
      console.log('✅ Sample appraiser created');
    }
    
    // Get the IDs
    const pawner = await pool.query('SELECT id FROM pawners LIMIT 1');
    const appraiser = await pool.query('SELECT id FROM employees WHERE role = \'appraiser\' LIMIT 1');
    
    let appraiserId = null;
    if (appraiser.rows.length === 0) {
      // Use any employee as appraiser
      const anyEmployee = await pool.query('SELECT id FROM employees LIMIT 1');
      if (anyEmployee.rows.length > 0) {
        appraiserId = anyEmployee.rows[0].id;
      }
    } else {
      appraiserId = appraiser.rows[0].id;
    }
    
    const pawnerId = pawner.rows[0].id;
    
    // Create sample item appraisals
    const sampleAppraisals = [
      {
        category: 'jewelry',
        categoryDescription: 'Gold Ring',
        itemType: 'ring', 
        description: '18k gold wedding ring with diamond',
        serialNumber: 'GR001',
        weight: 5.2,
        karat: '18k',
        estimatedValue: 25000,
        conditionNotes: 'Excellent condition, no scratches',
        status: 'completed'
      },
      {
        category: 'electronics',
        categoryDescription: 'Smartphone',
        itemType: 'phone',
        description: 'iPhone 13 Pro 256GB Space Gray',
        serialNumber: 'IP13001',
        weight: null,
        karat: null,
        estimatedValue: 45000,
        conditionNotes: 'Good condition, minor wear on edges',
        status: 'completed'
      },
      {
        category: 'jewelry',
        categoryDescription: 'Gold Necklace',
        itemType: 'necklace',
        description: '22k gold chain necklace 20 inches',
        serialNumber: 'GN002',
        weight: 12.5,
        karat: '22k',
        estimatedValue: 65000,
        conditionNotes: 'Very good condition, original luster',
        status: 'completed'
      },
      {
        category: 'watch',
        categoryDescription: 'Luxury Watch',
        itemType: 'wristwatch',
        description: 'Rolex Submariner automatic watch',
        serialNumber: 'RX001',
        weight: null,
        karat: null,
        estimatedValue: 350000,
        conditionNotes: 'Excellent condition, with original box and papers',
        status: 'pending'
      }
    ];
    
    for (const appraisal of sampleAppraisals) {
      await pool.query(`
        INSERT INTO item_appraisals (
          pawner_id, appraiser_id, category, category_description, item_type,
          description, serial_number, weight, karat, estimated_value, 
          condition_notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        pawnerId, appraiserId, appraisal.category, appraisal.categoryDescription,
        appraisal.itemType, appraisal.description, appraisal.serialNumber,
        appraisal.weight, appraisal.karat, appraisal.estimatedValue,
        appraisal.conditionNotes, appraisal.status
      ]);
    }
    
    console.log(`✅ Created ${sampleAppraisals.length} sample item appraisals`);
    
    // Check the created data
    const result = await pool.query(`
      SELECT ia.*, p.first_name, p.last_name, e.first_name as appraiser_name
      FROM item_appraisals ia
      JOIN pawners p ON ia.pawner_id = p.id
      LEFT JOIN employees e ON ia.appraiser_id = e.id
      ORDER BY ia.created_at DESC
    `);
    
    console.log('\n=== CREATED APPRAISALS ===');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.category_description} - ₱${row.estimated_value} (${row.status})`);
      console.log(`   Pawner: ${row.first_name} ${row.last_name}`);
      console.log(`   Appraiser: ${row.appraiser_name || 'Unknown'}`);
      console.log();
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

createSampleAppraisals();