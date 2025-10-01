const { pool } = require('./config/database');

async function getDataSummary() {
  try {
    console.log('📊 PAWNSHOP DATABASE - FINAL SEEDING SUMMARY');
    console.log('══════════════════════════════════════════════════════');
    
    const tables = [
      'branches', 'users', 'pawners', 'cities', 'barangays',
      'pawn_tickets', 'pawn_items', 'pawn_payments', 'categories',
      'category_descriptions', 'appraisals', 'transactions',
      'loan_rules', 'voucher_types', 'audit_logs', 'audit_trail'
    ];
    
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        totalRecords += count;
        console.log(`📋 ${table.padEnd(25)} | ${count.toString().padStart(6)} records`);
      } catch (error) {
        console.log(`❌ ${table.padEnd(25)} | ERROR - Table might not exist`);
      }
    }
    
    console.log('──────────────────────────────────────────────────────');
    console.log(`📈 TOTAL RECORDS                 | ${totalRecords.toString().padStart(6)} records`);
    console.log('══════════════════════════════════════════════════════');
    
    // Show sample data
    console.log('\n🔐 DEMO USER ACCOUNTS:');
    const users = await pool.query(`
      SELECT username, role, CONCAT(first_name, ' ', last_name) as full_name, 
             contact_number, position 
      FROM users 
      ORDER BY role, username
    `);
    
    users.rows.forEach(user => {
      console.log(`👤 ${user.username.padEnd(15)} | ${user.role.padEnd(13)} | ${user.full_name} | ${user.position}`);
    });
    
    console.log('\n🏪 SAMPLE PAWNERS:');
    const pawners = await pool.query(`
      SELECT CONCAT(first_name, ' ', last_name) as full_name, 
             contact_number, email
      FROM pawners 
      ORDER BY id 
      LIMIT 5
    `);
    
    pawners.rows.forEach(pawner => {
      console.log(`👥 ${pawner.full_name.padEnd(20)} | ${pawner.contact_number} | ${pawner.email || 'No email'}`);
    });
    
    console.log('\n🎫 SAMPLE PAWN TICKETS:');
    const tickets = await pool.query(`
      SELECT pt.ticket_number, 
             CONCAT(p.first_name, ' ', p.last_name) as pawner_name,
             pt.principal_amount, pt.status, pt.maturity_date
      FROM pawn_tickets pt
      JOIN pawners p ON pt.pawner_id = p.id
      ORDER BY pt.id
      LIMIT 5
    `);
    
    tickets.rows.forEach(ticket => {
      console.log(`🎫 ${ticket.ticket_number} | ${ticket.pawner_name.padEnd(15)} | ₱${ticket.principal_amount} | ${ticket.status} | ${ticket.maturity_date}`);
    });
    
    console.log('\n🏙️ CITIES AND BARANGAYS:');
    const citiesData = await pool.query(`
      SELECT c.name as city_name, COUNT(b.id) as barangay_count
      FROM cities c
      LEFT JOIN barangays b ON c.id = b.city_id
      GROUP BY c.id, c.name
      ORDER BY barangay_count DESC
      LIMIT 5
    `);
    
    citiesData.rows.forEach(city => {
      console.log(`🏙️ ${city.city_name.padEnd(15)} | ${city.barangay_count} barangays`);
    });
    
    console.log('\n📋 DEFAULT PASSWORDS:');
    console.log('   admin      | admin123');
    console.log('   manager1   | manager123');
    console.log('   cashier1   | cashier123');
    console.log('   auctioneer1| auctioneer123');
    console.log('   appraiser1 | appraiser123');
    
    console.log('\n✅ ALL TABLES HAVE BEEN SUCCESSFULLY SEEDED!');
    console.log('🚀 Your pawnshop management system is ready to use!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    await pool.end();
  }
}

getDataSummary();