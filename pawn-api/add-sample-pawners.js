const { pool } = require('./config/database');

async function addSamplePawners() {
  try {
    console.log('🏗️ Adding sample pawners...');

    // Sample pawner data
    const samplePawners = [
      {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        contactNumber: '+63 917 123 4567',
        email: 'juan.delacruz@email.com',
        cityId: 1,
        barangayId: 1,
        addressDetails: '123 Rizal Street, Manila'
      },
      {
        firstName: 'Maria',
        lastName: 'Santos',
        contactNumber: '+63 928 987 6543',
        email: 'maria.santos@email.com',
        cityId: 1,
        barangayId: 2,
        addressDetails: '456 Bonifacio Avenue, Manila'
      },
      {
        firstName: 'Pedro',
        lastName: 'Rodriguez',
        contactNumber: '+63 939 555 1234',
        email: 'pedro.rodriguez@email.com',
        cityId: 1,
        barangayId: 3,
        addressDetails: '789 Mabini Street, Manila'
      },
      {
        firstName: 'Ana',
        lastName: 'Garcia',
        contactNumber: '+63 920 111 2222',
        email: 'ana.garcia@email.com',
        cityId: 1,
        barangayId: 4,
        addressDetails: '321 Taft Avenue, Manila'
      },
      {
        firstName: 'Carlos',
        lastName: 'Lopez',
        contactNumber: '+63 905 333 4444',
        email: 'carlos.lopez@email.com',
        cityId: 1,
        barangayId: 5,
        addressDetails: '654 Quezon Boulevard, Manila'
      },
      {
        firstName: 'Rosa',
        lastName: 'Fernandez',
        contactNumber: '+63 912 777 8888',
        email: 'rosa.fernandez@email.com',
        cityId: 1,
        barangayId: 1,
        addressDetails: '987 Escolta Street, Manila'
      },
      {
        firstName: 'Miguel',
        lastName: 'Reyes',
        contactNumber: '+63 918 999 0000',
        email: 'miguel.reyes@email.com',
        cityId: 1,
        barangayId: 2,
        addressDetails: '147 Recto Avenue, Manila'
      },
      {
        firstName: 'Carmen',
        lastName: 'Torres',
        contactNumber: '+63 945 222 3333',
        email: 'carmen.torres@email.com',
        cityId: 1,
        barangayId: 3,
        addressDetails: '258 Legarda Street, Manila'
      }
    ];

    // Insert each pawner
    for (const pawner of samplePawners) {
      // Check if pawner already exists
      const existing = await pool.query(
        'SELECT id FROM pawners WHERE contact_number = $1',
        [pawner.contactNumber]
      );

      if (existing.rows.length === 0) {
        const result = await pool.query(`
          INSERT INTO pawners (first_name, last_name, contact_number, email, city_id, barangay_id, address_details)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          pawner.firstName,
          pawner.lastName,
          pawner.contactNumber,
          pawner.email,
          pawner.cityId,
          pawner.barangayId,
          pawner.addressDetails
        ]);
        
        console.log(`✅ Added: ${pawner.firstName} ${pawner.lastName} (ID: ${result.rows[0].id})`);
      } else {
        console.log(`⚠️ Skipped: ${pawner.firstName} ${pawner.lastName} (already exists)`);
      }
    }

    // Display total count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM pawners');
    console.log(`📊 Total pawners in database: ${totalResult.rows[0].count}`);
    
    console.log('🎉 Sample pawners added successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding sample pawners:', error);
    process.exit(1);
  }
}

addSamplePawners();