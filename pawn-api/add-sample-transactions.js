const { pool } = require('./config/database');

async function addSampleTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🎫 Adding sample pawn transactions with PT-2024 format...');
    
    await client.query('BEGIN');
    
    // Check if PT-2024 transactions already exist
    const existingTransactions = await client.query(`
      SELECT COUNT(*) FROM pawn_tickets WHERE ticket_number LIKE 'PT-2024-%'
    `);
    const transactionCount = parseInt(existingTransactions.rows[0].count);
    
    if (transactionCount === 0) {
      // Get pawners and users
      const pawners = await client.query('SELECT id FROM pawners LIMIT 5');
      const adminUser = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      
      if (pawners.rows.length === 0) {
        console.log('❌ No pawners found. Please run add-sample-data.js first.');
        return;
      }
      
      const createdBy = adminUser.rows[0]?.id || 1;
      
      // Get or create default branch
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
      
      // Create sample transactions
      const sampleTransactions = [
        {
          ticketNumber: 'PT-2024-001',
          pawnerId: pawners.rows[0].id,
          transactionType: 'new_loan',
          principalAmount: 15000.00,
          interestRate: 3.00,
          interestAmount: 450.00,
          serviceCharge: 75.00,
          netProceeds: 14925.00,
          totalAmount: 15525.00,
          dueAmount: 15525.00,
          balanceRemaining: 15525.00,
          status: 'active'
        },
        {
          ticketNumber: 'PT-2024-002',
          pawnerId: pawners.rows[1] ? pawners.rows[1].id : pawners.rows[0].id,
          transactionType: 'new_loan',
          principalAmount: 25000.00,
          interestRate: 3.00,
          interestAmount: 750.00,
          serviceCharge: 125.00,
          netProceeds: 24875.00,
          totalAmount: 25875.00,
          dueAmount: 25875.00,
          balanceRemaining: 25875.00,
          status: 'active'
        },
        {
          ticketNumber: 'PT-2024-003',
          pawnerId: pawners.rows[2] ? pawners.rows[2].id : pawners.rows[0].id,
          transactionType: 'new_loan',
          principalAmount: 8000.00,
          interestRate: 3.00,
          interestAmount: 240.00,
          serviceCharge: 40.00,
          netProceeds: 7960.00,
          totalAmount: 8280.00,
          dueAmount: 8280.00,
          balanceRemaining: 8280.00,
          status: 'active'
        },
        {
          ticketNumber: 'PT-2024-004',
          pawnerId: pawners.rows[3] ? pawners.rows[3].id : pawners.rows[0].id,
          transactionType: 'new_loan',
          principalAmount: 35000.00,
          interestRate: 3.00,
          interestAmount: 1050.00,
          serviceCharge: 175.00,
          netProceeds: 34825.00,
          totalAmount: 36225.00,
          dueAmount: 36225.00,
          balanceRemaining: 36225.00,
          status: 'active'
        },
        {
          ticketNumber: 'PT-2024-005',
          pawnerId: pawners.rows[4] ? pawners.rows[4].id : pawners.rows[0].id,
          transactionType: 'new_loan',
          principalAmount: 12000.00,
          interestRate: 3.00,
          interestAmount: 360.00,
          serviceCharge: 60.00,
          netProceeds: 11940.00,
          totalAmount: 12420.00,
          dueAmount: 12420.00,
          balanceRemaining: 12420.00,
          status: 'active'
        }
      ];
      
      // Calculate dates
      const now = new Date();
      const transactionDate = new Date(now);
      const loanDate = new Date(now);
      const maturityDate = new Date(now.getTime() + (120 * 24 * 60 * 60 * 1000)); // 120 days from now
      const expiryDate = new Date(maturityDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after maturity
      
      for (const transaction of sampleTransactions) {
        const ticketResult = await client.query(`
          INSERT INTO pawn_tickets (
            ticket_number, pawner_id, branch_id, created_by, transaction_type,
            transaction_date, loan_date, maturity_date, expiry_date,
            principal_amount, interest_rate, interest_amount, service_charge, 
            net_proceeds, total_amount, due_amount, balance_remaining,
            status, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id
        `, [
          transaction.ticketNumber, transaction.pawnerId, branchId, createdBy, transaction.transactionType,
          transactionDate, loanDate, maturityDate, expiryDate,
          transaction.principalAmount, transaction.interestRate, transaction.interestAmount, 
          transaction.serviceCharge, transaction.netProceeds, transaction.totalAmount, 
          transaction.dueAmount, transaction.balanceRemaining, transaction.status, now, now
        ]);
        
        const ticketId = ticketResult.rows[0].id;
        
        // Add sample items for each transaction
        const sampleItems = [
          {
            category: 'Gold Jewelry',
            categoryDescription: 'Gold necklace, bracelet, and earrings',
            description: '18k gold jewelry set with intricate design',
            appraisalValue: transaction.principalAmount * 1.2
          },
          {
            category: 'Electronics',
            categoryDescription: 'Smartphone and accessories',
            description: 'Latest model smartphone with original packaging',
            appraisalValue: transaction.principalAmount * 0.8
          }
        ];
        
        for (const item of sampleItems) {
          await client.query(`
            INSERT INTO pawn_items (
              ticket_id, category, category_description, description, appraisal_value, estimated_value
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            ticketId, item.category, item.categoryDescription, item.description, 
            item.appraisalValue, item.appraisalValue
          ]);
        }
        
        console.log(`✅ Added transaction: ${transaction.ticketNumber} (₱${transaction.principalAmount.toLocaleString()})`);
      }
      
      // Ensure transaction sequence exists for 2024
      await client.query(`
        INSERT INTO transaction_sequences (year, next_number) 
        VALUES (2024, 6) 
        ON CONFLICT (year) DO UPDATE SET next_number = GREATEST(transaction_sequences.next_number, 6)
      `);
      
    } else {
      console.log(`ℹ️  PT-2024 transactions already exist (${transactionCount} transactions found)`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 Sample transactions added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding sample transactions:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addSampleTransactions();
    process.exit(0);
  } catch (error) {
    console.error('Failed to add sample transactions:', error);
    process.exit(1);
  }
}

main();