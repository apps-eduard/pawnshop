const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    const auctioneerPassword = await bcrypt.hash('auctioneer123', 10);
    const appraiserPassword = await bcrypt.hash('appraiser123', 10);

    // Insert branches
    console.log('📍 Creating branches...');
    const branchResult = await pool.query(`
      INSERT INTO branches (name, address, contact_number, is_active) 
      VALUES 
        ('Main Branch', '123 Main St, Downtown City', '+1-555-0101', true),
        ('North Branch', '456 North Ave, Uptown', '+1-555-0102', true),
        ('South Branch', '789 South Blvd, Southside', '+1-555-0103', true)
      RETURNING id, name
    `);
    
    const mainBranchId = branchResult.rows[0].id;
    const northBranchId = branchResult.rows[1].id;
    const southBranchId = branchResult.rows[2].id;
    
    console.log(`✅ Created ${branchResult.rows.length} branches`);

    // Insert employees (updated from users table)
    console.log('👤 Creating employees...');
    const userResult = await pool.query(`
      INSERT INTO employees (user_id, username, email, password_hash, first_name, last_name, role, branch_id, position, contact_number, address) 
      VALUES 
        (1, 'admin', 'admin@pawnshop.com', $1, 'John', 'Smith', 'administrator', $2, 'System Administrator', '+1-555-1001', '100 Admin Lane, Business District'),
        (2, 'manager1', 'manager@pawnshop.com', $3, 'Sarah', 'Johnson', 'manager', $4, 'Branch Manager', '+1-555-1002', '200 Manager St, Executive Area'),
        (3, 'cashier1', 'cashier@pawnshop.com', $5, 'Lisa', 'Wilson', 'cashier', $6, 'Senior Cashier', '+1-555-1004', '400 Cashier Rd, Residential'),
        (4, 'auctioneer1', 'auctioneer@pawnshop.com', $7, 'Tom', 'Brown', 'auctioneer', $8, 'Lead Auctioneer', '+1-555-1005', '500 Auctioneer Ct, Suburban Area'),
        (5, 'appraiser1', 'appraiser@pawnshop.com', $9, 'Mike', 'Davis', 'appraiser', $10, 'Senior Appraiser', '+1-555-1003', '300 Appraiser Ave, Mid-town')
      RETURNING user_id, username, role
    `, [
      adminPassword, mainBranchId,
      managerPassword, mainBranchId, 
      cashierPassword, mainBranchId,
      auctioneerPassword, southBranchId,
      appraiserPassword, northBranchId
    ]);
    
    console.log(`✅ Created ${userResult.rows.length} employees`);

    // Get user IDs for references (using user_id from employees table)
    const adminId = userResult.rows.find(u => u.username === 'admin').user_id;
    const managerId = userResult.rows.find(u => u.username === 'manager1').user_id;
    const cashierId = userResult.rows.find(u => u.username === 'cashier1').user_id;
    const auctioneerId = userResult.rows.find(u => u.username === 'auctioneer1').user_id;
    const appraiserId = userResult.rows.find(u => u.username === 'appraiser1').user_id;

    // Update branch managers
    console.log('👨‍💼 Assigning branch managers...');
    await pool.query(`
      UPDATE branches 
      SET manager_id = $1 
      WHERE id = $2
    `, [managerId, mainBranchId]);

    // Insert sample pawners
    console.log('🏪 Creating sample pawners...');
    const pawnerResult = await pool.query(`
      INSERT INTO pawners (first_name, last_name, contact_number, email, address, id_type, id_number, birth_date) 
      VALUES 
        ('Maria', 'Garcia', '+1-555-2001', 'maria.garcia@email.com', '1001 Customer Lane, City Center', 'Drivers License', 'DL123456789', '1985-03-15'),
        ('Robert', 'Martinez', '+1-555-2002', 'robert.martinez@email.com', '1002 Client St, Downtown', 'State ID', 'ID987654321', '1978-07-22'),
        ('Anna', 'Rodriguez', '+1-555-2003', 'anna.rodriguez@email.com', '1003 Patron Ave, Midtown', 'Passport', 'PP456789123', '1992-11-08'),
        ('David', 'Lopez', '+1-555-2004', 'david.lopez@email.com', '1004 Guest Blvd, Uptown', 'Drivers License', 'DL789123456', '1980-05-30'),
        ('Carmen', 'Hernandez', '+1-555-2005', 'carmen.hernandez@email.com', '1005 Visitor Rd, Suburb', 'State ID', 'ID321654987', '1988-12-14')
      RETURNING id, first_name, last_name
    `);
    
    console.log(`✅ Created ${pawnerResult.rows.length} pawners`);

    // Insert sample pawn tickets
    console.log('🎫 Creating sample pawn tickets...');
    const pawnerId1 = pawnerResult.rows[0].id;
    const pawnerId2 = pawnerResult.rows[1].id;
    
    const ticketResult = await pool.query(`
      INSERT INTO pawn_tickets (ticket_number, pawner_id, branch_id, created_by, principal_amount, interest_rate, service_charge, total_amount, maturity_date, status, notes) 
      VALUES 
        ('PT-2024-001', $1, $2, $3, 500.00, 3.00, 25.00, 525.00, CURRENT_DATE + INTERVAL '4 months', 'active', 'Gold necklace with pendant'),
        ('PT-2024-002', $4, $5, $6, 1200.00, 3.00, 60.00, 1260.00, CURRENT_DATE + INTERVAL '4 months', 'active', 'Laptop computer and accessories'),
        ('PT-2024-003', $7, $8, $9, 300.00, 3.00, 15.00, 315.00, CURRENT_DATE + INTERVAL '2 months', 'redeemed', 'Smartphone - Samsung Galaxy'),
        ('PT-2024-004', $10, $11, $12, 800.00, 3.00, 40.00, 840.00, CURRENT_DATE + INTERVAL '3 months', 'active', 'Gold bracelet set'),
        ('PT-2024-005', $13, $14, $15, 2000.00, 3.00, 100.00, 2100.00, CURRENT_DATE + INTERVAL '6 months', 'active', 'Diamond ring - 1 carat')
      RETURNING id, ticket_number
    `, [
      pawnerId1, mainBranchId, cashierId,
      pawnerId2, mainBranchId, cashierId,
      pawnerId1, northBranchId, cashierId,
      pawnerId2, southBranchId, cashierId,
      pawnerId1, mainBranchId, managerId
    ]);
    
    console.log(`✅ Created ${ticketResult.rows.length} pawn tickets`);

    // Insert sample pawn items
    console.log('💍 Creating sample pawn items...');
    const ticket1Id = ticketResult.rows[0].id;
    const ticket2Id = ticketResult.rows[1].id;
    const ticket3Id = ticketResult.rows[2].id;
    
    await pool.query(`
      INSERT INTO pawn_items (ticket_id, item_type, brand, model, description, estimated_value, condition_notes, weight, karat) 
      VALUES 
        ($1, 'Jewelry', 'Custom', 'N/A', '18k Gold necklace with heart pendant', 500.00, 'Excellent condition, minimal wear', 15.5, 18),
        ($2, 'Electronics', 'Dell', 'Inspiron 15', 'Laptop computer with charger and mouse', 1200.00, 'Good working condition, minor scratches on lid', NULL, NULL),
        ($3, 'Electronics', 'Samsung', 'Galaxy S21', 'Smartphone with original box and accessories', 300.00, 'Very good condition, screen protector applied', NULL, NULL),
        ($1, 'Jewelry', 'Custom', 'N/A', 'Matching earrings for necklace', 150.00, 'Excellent condition', 3.2, 18),
        ($2, 'Electronics', 'Logitech', 'MX Master 3', 'Wireless mouse', 80.00, 'Like new condition', NULL, NULL)
      RETURNING id, item_type, description
    `, [ticket1Id, ticket2Id, ticket3Id]);
    
    console.log('✅ Created sample pawn items');

    // Insert sample payments
    console.log('💰 Creating sample payments...');
    await pool.query(`
      INSERT INTO pawn_payments (ticket_id, payment_type, amount, processed_by, notes) 
      VALUES 
        ($1, 'interest', 45.00, $2, 'Monthly interest payment'),
        ($3, 'full_redemption', 315.00, $4, 'Full redemption payment'),
        ($5, 'interest', 60.00, $6, 'Quarterly interest payment')
    `, [ticket1Id, cashierId, ticket3Id, cashierId, ticket2Id, managerId]);
    
    console.log('✅ Created sample payments');

    // Insert audit log entries
    console.log('📋 Creating audit log entries...');
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
      VALUES 
        ($1, 'CREATE_TICKET', 'pawn_tickets', 1, '{"ticket_number": "PT-2024-001", "amount": 500.00}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
        ($2, 'PROCESS_PAYMENT', 'pawn_payments', 1, '{"amount": 45.00, "type": "interest"}', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
        ($3, 'CREATE_PAWNER', 'pawners', 1, '{"name": "Maria Garcia", "contact": "+1-555-2001"}', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    `, [cashierId, cashierId, adminId]);
    
    console.log('✅ Created audit log entries');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 3 branches created');
    console.log('- 5 employees created (admin, manager, cashier, auctioneer, appraiser)');
    console.log('- 5 pawners created');
    console.log('- 5 pawn tickets created');
    console.log('- Multiple pawn items created');
    console.log('- Sample payments and audit logs created');
    
    console.log('\n🔐 Demo Account Credentials:');
    console.log('Administrator: admin / admin123');
    console.log('Manager: manager1 / manager123');
    console.log('Cashier: cashier1 / cashier123');
    console.log('Auctioneer: auctioneer1 / auctioneer123');
    console.log('Appraiser: appraiser1 / appraiser123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

module.exports = { seedDatabase };

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🏁 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}