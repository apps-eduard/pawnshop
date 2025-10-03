const { pool } = require('./config/database');

async function checkTableStructures() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current table structures...');
    
    // Check users table structure
    console.log('\n📋 USERS table structure:');
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    if (usersColumns.rows.length > 0) {
      usersColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    } else {
      console.log('  Table not found or no columns');
    }
    
    // Check employees table structure
    console.log('\n👥 EMPLOYEES table structure:');
    const employeesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `);
    
    if (employeesColumns.rows.length > 0) {
      employeesColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    } else {
      console.log('  Table not found or no columns');
    }
    
    // Check current data in users table
    console.log('\n📊 Current data in USERS table:');
    const usersData = await client.query('SELECT id, username, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY id');
    if (usersData.rows.length > 0) {
      console.log(`Found ${usersData.rows.length} users:`);
      usersData.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Name: ${user.first_name} ${user.last_name}, Role: ${user.role}`);
      });
    } else {
      console.log('  No users found');
    }
    
    // Check current data in employees table
    console.log('\n📊 Current data in EMPLOYEES table:');
    const employeesData = await client.query('SELECT id, user_id, position, contact_number, created_at FROM employees ORDER BY id');
    if (employeesData.rows.length > 0) {
      console.log(`Found ${employeesData.rows.length} employees:`);
      employeesData.rows.forEach(emp => {
        console.log(`  - ID: ${emp.id}, User ID: ${emp.user_id}, Position: ${emp.position}, Contact: ${emp.contact_number}`);
      });
    } else {
      console.log('  No employees found');
    }
    
  } catch (error) {
    console.error('❌ Error checking table structures:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkTableStructures();
    process.exit(0);
  } catch (error) {
    console.error('Failed to check tables:', error);
    process.exit(1);
  }
}

main();