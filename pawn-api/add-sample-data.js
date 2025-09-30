const { pool } = require('./config/database');
const bcrypt = require('bcrypt');

async function addSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Adding sample data...');
    
    await client.query('BEGIN');
    
    // Check if users already exist
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(existingUsers.rows[0].count);
    
    if (userCount === 0) {
      console.log('📝 Adding sample users...');
      
      // Sample users with different roles
      const sampleUsers = [
        {
          username: 'admin',
          email: 'admin@goldwin.com',
          firstName: 'John',
          lastName: 'Admin',
          role: 'admin',
          password: 'admin123',
          position: 'System Administrator',
          contactNumber: '09123456789'
        },
        {
          username: 'manager1',
          email: 'manager@goldwin.com',
          firstName: 'Jane',
          lastName: 'Manager',
          role: 'manager',
          password: 'manager123',
          position: 'Branch Manager',
          contactNumber: '09123456788'
        },
        {
          username: 'cashier1',
          email: 'cashier@goldwin.com',
          firstName: 'Mike',
          lastName: 'Cashier',
          role: 'cashier',
          password: 'cashier123',
          position: 'Senior Cashier',
          contactNumber: '09123456787'
        }
      ];
      
      for (const user of sampleUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        const userResult = await client.query(`
          INSERT INTO users (username, email, first_name, last_name, role, password_hash, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          RETURNING id
        `, [user.username, user.email, user.firstName, user.lastName, user.role, hashedPassword]);
        
        const userId = userResult.rows[0].id;
        
        // Add employee record
        await client.query(`
          INSERT INTO employees (user_id, position, contact_number)
          VALUES ($1, $2, $3)
        `, [userId, user.position, user.contactNumber]);
        
        console.log(`✅ Added user: ${user.username} (${user.role})`);
      }
    } else {
      console.log(`ℹ️  Users already exist (${userCount} users found)`);
    }
    
    // Check if pawners already exist
    const existingPawners = await client.query('SELECT COUNT(*) FROM pawners');
    const pawnerCount = parseInt(existingPawners.rows[0].count);
    
    if (pawnerCount === 0) {
      console.log('👥 Adding sample pawners...');
      
      // Get some cities and barangays for sample pawners
      const cities = await client.query('SELECT id, name FROM cities WHERE is_active = true LIMIT 3');
      
      if (cities.rows.length > 0) {
        const samplePawners = [
          {
            firstName: 'Juan',
            lastName: 'Santos',
            contactNumber: '09171234567',
            email: 'juan.santos@email.com',
            addressDetails: '123 Main Street, Unit 4B'
          },
          {
            firstName: 'Maria',
            lastName: 'Garcia',
            contactNumber: '09181234567',
            email: 'maria.garcia@email.com',
            addressDetails: '456 Oak Avenue, House 12'
          },
          {
            firstName: 'Pedro',
            lastName: 'Reyes',
            contactNumber: '09191234567',
            email: null,
            addressDetails: '789 Pine Street, Apartment 3A'
          },
          {
            firstName: 'Ana',
            lastName: 'Cruz',
            contactNumber: '09201234567',
            email: 'ana.cruz@email.com',
            addressDetails: '321 Elm Street, Building 2'
          },
          {
            firstName: 'Carlos',
            lastName: 'Mendoza',
            contactNumber: '09211234567',
            email: null,
            addressDetails: '654 Maple Drive, House 8'
          }
        ];
        
        for (let i = 0; i < samplePawners.length; i++) {
          const pawner = samplePawners[i];
          const city = cities.rows[i % cities.rows.length];
          
          // Get a barangay for this city
          const barangays = await client.query('SELECT id FROM barangays WHERE city_id = $1 AND is_active = true LIMIT 1', [city.id]);
          const barangayId = barangays.rows.length > 0 ? barangays.rows[0].id : null;
          
          await client.query(`
            INSERT INTO pawners (first_name, last_name, contact_number, email, city_id, barangay_id, address_details, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
          `, [
            pawner.firstName,
            pawner.lastName,
            pawner.contactNumber,
            pawner.email,
            city.id,
            barangayId,
            pawner.addressDetails
          ]);
          
          console.log(`✅ Added pawner: ${pawner.firstName} ${pawner.lastName} (${city.name})`);
        }
      } else {
        console.log('⚠️  No cities found, skipping pawner creation');
      }
    } else {
      console.log(`ℹ️  Pawners already exist (${pawnerCount} pawners found)`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 Sample data added successfully!');
    
    // Display login credentials
    console.log('\n📋 Login Credentials:');
    console.log('┌─────────────┬────────────┬─────────────┐');
    console.log('│ Username    │ Password   │ Role        │');
    console.log('├─────────────┼────────────┼─────────────┤');
    console.log('│ admin       │ admin123   │ admin       │');
    console.log('│ manager1    │ manager123 │ manager     │');
    console.log('│ cashier1    │ cashier123 │ cashier     │');
    console.log('└─────────────┴────────────┴─────────────┘');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding sample data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addSampleData();
    process.exit(0);
  } catch (error) {
    console.error('Failed to add sample data:', error);
    process.exit(1);
  }
}

main();