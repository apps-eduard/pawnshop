const { pool } = require('./config/database');

async function seedAppraisalData() {
  try {
    console.log('🎯 Seeding Appraisal Sample Data...\n');
    
    // Check if we have pawners and employees first
    const pawnersResult = await pool.query('SELECT id FROM pawners LIMIT 5;');
    const appraisersResult = await pool.query('SELECT id FROM employees WHERE role = \'appraiser\' LIMIT 3;');
    
    if (pawnersResult.rows.length === 0) {
      console.log('⚠️ No pawners found, creating sample pawner...');
      await pool.query(`
        INSERT INTO pawners (first_name, last_name, middle_name, phone, email, birth_date, gender, civil_status, house_number, barangay, city, province)
        VALUES ('Sample', 'Customer', 'A', '09123456789', 'sample@email.com', '1990-01-01', 'Male', 'Single', '123', 'Sample Barangay', 'Sample City', 'Sample Province')
        ON CONFLICT DO NOTHING;
      `);
    }
    
    if (appraisersResult.rows.length === 0) {
      console.log('⚠️ No appraisers found, using admin as appraiser...');
    }
    
    // Get available pawners and appraisers
    const pawners = await pool.query('SELECT id FROM pawners LIMIT 5;');
    const appraisers = await pool.query('SELECT id FROM employees WHERE role IN (\'appraiser\', \'admin\') LIMIT 3;');
    
    const pawnerIds = pawners.rows.map(p => p.id);
    const appraiserIds = appraisers.rows.map(a => a.id);
    
    // Clear existing sample appraisals to avoid duplicates
    await pool.query('DELETE FROM item_appraisals WHERE notes LIKE \'%Sample appraisal%\';');
    
    // Seed data: 2 closed and 3 pending appraisals (only Jewelry and Appliances)
    const appraisalsData = [
      // 2 CLOSED appraisals
      {
        pawner_id: pawnerIds[0] || 1,
        appraiser_id: appraiserIds[0] || 1,
        category: 'Jewelry',
        description: '18K Gold Necklace with Diamond Pendant',
        notes: 'Sample appraisal - High quality gold necklace, authentic diamonds verified',
        estimated_value: 25000.00,
        status: 'closed',
        created_at: '2024-09-15 10:30:00',
        updated_at: '2024-09-16 14:20:00'
      },
      {
        pawner_id: pawnerIds[1] || 1,
        appraiser_id: appraiserIds[1] || appraiserIds[0] || 1,
        category: 'Appliances',
        description: 'LG 1.5HP Split Type Air Conditioner',
        notes: 'Sample appraisal - Excellent cooling condition, with remote and manual',
        estimated_value: 35000.00,
        status: 'closed',
        created_at: '2024-09-20 09:15:00',
        updated_at: '2024-09-21 11:45:00'
      },
      
      // 3 PENDING appraisals
      {
        pawner_id: pawnerIds[2] || pawnerIds[0] || 1,
        appraiser_id: null, // Not yet assigned
        category: 'Appliances',
        description: 'Samsung 65-inch 4K Smart TV',
        notes: 'Sample appraisal - Awaiting appraiser assignment',
        estimated_value: 45000.00,
        status: 'pending',
        created_at: '2024-10-01 13:20:00',
        updated_at: '2024-10-01 13:20:00'
      },
      {
        pawner_id: pawnerIds[3] || pawnerIds[0] || 1,
        appraiser_id: appraiserIds[2] || appraiserIds[0] || 1,
        category: 'Jewelry',
        description: 'Rolex Submariner Watch (Steel)',
        notes: 'Sample appraisal - Luxury watch, authenticity verification in progress',
        estimated_value: 150000.00,
        status: 'pending',
        created_at: '2024-10-03 16:10:00',
        updated_at: '2024-10-03 16:10:00'
      },
      {
        pawner_id: pawnerIds[4] || pawnerIds[0] || 1,
        appraiser_id: null, // Not yet assigned
        category: 'Jewelry',
        description: '14K Gold Ring with Ruby Stone',
        notes: 'Sample appraisal - Precious stone authenticity verification needed',
        estimated_value: 18000.00,
        status: 'pending',
        created_at: '2024-10-04 11:30:00',
        updated_at: '2024-10-04 11:30:00'
      }
    ];
    
    // Insert the appraisal data
    console.log('📝 Inserting appraisal sample data...');
    
    for (const appraisal of appraisalsData) {
      const query = `
        INSERT INTO item_appraisals (
          pawner_id, appraiser_id, category, description, notes, 
          estimated_value, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, category, status, estimated_value;
      `;
      
      const values = [
        appraisal.pawner_id,
        appraisal.appraiser_id,
        appraisal.category,
        appraisal.description,
        appraisal.notes,
        appraisal.estimated_value,
        appraisal.status,
        appraisal.created_at,
        appraisal.updated_at
      ];
      
      const result = await pool.query(query, values);
      const inserted = result.rows[0];
      console.log(`  ✅ Created ${inserted.status} appraisal: ${inserted.category} - ₱${Number(inserted.estimated_value).toLocaleString()}`);
    }
    
    // Summary
    console.log('\n📊 Appraisal Data Summary:');
    const summary = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(estimated_value) as avg_value
      FROM item_appraisals 
      WHERE notes LIKE '%Sample appraisal%'
      GROUP BY status
      ORDER BY status;
    `);
    
    summary.rows.forEach(row => {
      console.log(`  ├─ ${row.status.toUpperCase()}: ${row.count} appraisals (Avg: ₱${Number(row.avg_value).toLocaleString()})`);
    });
    
    console.log('\n🎉 Appraisal sample data seeded successfully!');
    console.log('   • 2 closed appraisals (completed assessments)');
    console.log('   • 3 pending appraisals (awaiting processing)');
    console.log('   • Categories: Jewelry and Appliances only');
    console.log('   • Total estimated value: ₱273,000');
    
  } catch (error) {
    console.error('❌ Error seeding appraisal data:', error.message);
    throw error;
  } finally {
    pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedAppraisalData()
    .then(() => {
      console.log('\n✅ Appraisal data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Appraisal data seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedAppraisalData };