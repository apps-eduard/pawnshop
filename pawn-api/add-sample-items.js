const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function addSampleItems() {
  const client = await pool.connect();
  
  try {
    console.log('📄 Connected to PostgreSQL database');
    console.log('🔍 Adding sample pawn tickets and items...');

    // Check if pawn tickets exist
    const existingTickets = await client.query('SELECT COUNT(*) FROM pawn_tickets');
    const ticketCount = parseInt(existingTickets.rows[0].count);
    
    if (ticketCount === 0) {
      console.log('🎫 Adding sample pawn tickets first...');
      
      // Get some pawners
      const pawners = await client.query('SELECT id FROM pawners LIMIT 3');
      
      if (pawners.rows.length === 0) {
        console.log('❌ No pawners found. Please run add-sample-data.js first.');
        return;
      }
      
      // Create sample pawn tickets
      const sampleTickets = [
        {
          ticketNumber: 'PN-2025-001',
          pawnerId: pawners.rows[0].id,
          principalAmount: 15000.00,
          interestRate: 3.00,
          serviceCharge: 50.00,
          totalAmount: 15050.00,
          maturityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: 'active'
        },
        {
          ticketNumber: 'PN-2025-002',
          pawnerId: pawners.rows[1] ? pawners.rows[1].id : pawners.rows[0].id,
          principalAmount: 25000.00,
          interestRate: 3.00,
          serviceCharge: 75.00,
          totalAmount: 25075.00,
          maturityDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
          status: 'active'
        },
        {
          ticketNumber: 'PN-2025-003',
          pawnerId: pawners.rows[2] ? pawners.rows[2].id : pawners.rows[0].id,
          principalAmount: 8000.00,
          interestRate: 3.00,
          serviceCharge: 30.00,
          totalAmount: 8030.00,
          maturityDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
          status: 'active'
        }
      ];

      // Get admin user ID
      const adminUser = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      const createdBy = adminUser.rows[0]?.id || 1;

      // Get default branch (create if doesn't exist)
      let branch = await client.query('SELECT id FROM branches LIMIT 1');
      if (branch.rows.length === 0) {
        const branchResult = await client.query(`
          INSERT INTO branches (name, address, contact_number, is_active)
          VALUES ('Main Branch', '123 Main Street, City', '123-456-7890', true)
          RETURNING id
        `);
        branch = branchResult;
      }
      const branchId = branch.rows[0].id;

      for (const ticket of sampleTickets) {
        const ticketResult = await client.query(`
          INSERT INTO pawn_tickets 
          (ticket_number, pawner_id, branch_id, created_by, principal_amount, 
           interest_rate, service_charge, total_amount, maturity_date, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          ticket.ticketNumber, ticket.pawnerId, branchId, createdBy,
          ticket.principalAmount, ticket.interestRate, ticket.serviceCharge,
          ticket.totalAmount, ticket.maturityDate, ticket.status
        ]);

        console.log(`✅ Added pawn ticket: ${ticket.ticketNumber}`);
      }
    } else {
      console.log(`ℹ️  Pawn tickets already exist (${ticketCount} tickets found)`);
    }

    // Check if items already exist
    const existingItems = await client.query('SELECT COUNT(*) FROM pawn_items');
    const itemCount = parseInt(existingItems.rows[0].count);
    
    if (itemCount === 0) {
      console.log('📦 Adding sample pawn items...');
      
      // Get pawn tickets
      const tickets = await client.query('SELECT id FROM pawn_tickets LIMIT 5');
      
      const sampleItems = [
        // Gold jewelry items
        {
          ticketId: tickets.rows[0]?.id,
          itemType: 'Jewelry - Gold',
          brand: 'Paulo Coelho',
          model: 'Classic Chain',
          description: '18k gold necklace with intricate chain design, excellent condition',
          estimatedValue: 15000.00,
          conditionNotes: 'Minimal wear, original shine maintained',
          serialNumber: 'PC-GN-001',
          weight: 25.5,
          karat: 18
        },
        {
          ticketId: tickets.rows[0]?.id,
          itemType: 'Jewelry - Gold',
          brand: 'Tiffany & Co',
          model: 'Solitaire',
          description: '14k gold ring with diamond solitaire setting',
          estimatedValue: 12000.00,
          conditionNotes: 'Good condition, minor scratches on band',
          serialNumber: 'TF-GR-002',
          weight: 4.2,
          karat: 14
        },
        // Electronics items
        {
          ticketId: tickets.rows[1]?.id,
          itemType: 'Electronics - Mobile Phone',
          brand: 'iPhone',
          model: '14 Pro Max',
          description: 'iPhone 14 Pro Max 256GB Deep Purple, with original box and accessories',
          estimatedValue: 45000.00,
          conditionNotes: 'Excellent condition, screen protector applied, no visible damage',
          serialNumber: 'IP14PM256DP001'
        },
        {
          ticketId: tickets.rows[1]?.id,
          itemType: 'Electronics - Watch',
          brand: 'Apple',
          model: 'Watch Series 9',
          description: 'Apple Watch Series 9 45mm GPS + Cellular, Sport Band',
          estimatedValue: 18000.00,
          conditionNotes: 'Like new condition, includes charger and original band',
          serialNumber: 'AW9-45-GPS-001'
        },
        // Other items
        {
          ticketId: tickets.rows[2]?.id,
          itemType: 'Electronics - Laptop',
          brand: 'MacBook',
          model: 'Air M2',
          description: 'MacBook Air 13-inch M2 chip, 8GB RAM, 256GB SSD, Space Gray',
          estimatedValue: 55000.00,
          conditionNotes: 'Very good condition, minor scuffs on lid, battery health excellent',
          serialNumber: 'MBA13M2-001'
        },
        {
          ticketId: tickets.rows[2]?.id,
          itemType: 'Jewelry - Silver',
          brand: 'Pandora',
          model: 'Charm Bracelet',
          description: 'Sterling silver charm bracelet with 8 authentic Pandora charms',
          estimatedValue: 8500.00,
          conditionNotes: 'Good condition, some tarnishing on silver, charms intact',
          serialNumber: 'PD-CB-003',
          weight: 45.8
        }
      ];

      for (const item of sampleItems) {
        if (item.ticketId) {
          await client.query(`
            INSERT INTO pawn_items 
            (ticket_id, item_type, brand, model, description, estimated_value,
             condition_notes, serial_number, weight, karat)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            item.ticketId, item.itemType, item.brand, item.model,
            item.description, item.estimatedValue, item.conditionNotes,
            item.serialNumber, item.weight, item.karat
          ]);

          console.log(`✅ Added item: ${item.itemType} - ${item.brand} ${item.model}`);
        }
      }
    } else {
      console.log(`ℹ️  Items already exist (${itemCount} items found)`);
    }

    console.log('🎉 Sample pawn tickets and items added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSampleItems().catch(console.error);