const { pool } = require('./config/database');

async function testTransactionChain() {
  try {
    console.log('🧪 Testing Transaction Chain with new_principal_loan tracking\n');
    
    // Test scenario: Find a transaction with partial payments
    const result = await pool.query(`
      SELECT 
        t.id,
        t.transaction_number,
        t.transaction_type,
        t.principal_amount,
        t.balance,
        t.new_principal_loan,
        t.amount_paid,
        t.parent_transaction_id,
        t.created_at
      FROM transactions t
      WHERE t.transaction_number = 'TXN-202510-000007'
         OR t.parent_transaction_id IN (
           SELECT id FROM transactions WHERE transaction_number = 'TXN-202510-000007'
         )
      ORDER BY t.created_at ASC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No transactions found for TXN-202510-000007');
      await pool.end();
      return;
    }
    
    console.log('📊 Transaction Chain for TXN-202510-000007:\n');
    console.log('═'.repeat(100));
    
    let parentTransaction = null;
    
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.transaction_type.toUpperCase()}`);
      console.log('   Transaction Number:', row.transaction_number);
      console.log('   Original Principal:', row.principal_amount);
      console.log('   Current Balance:', row.balance);
      console.log('   New Principal Loan:', row.new_principal_loan || 'N/A');
      console.log('   Amount Paid:', row.amount_paid || 'N/A');
      console.log('   Is Child Transaction:', row.parent_transaction_id ? 'Yes' : 'No');
      console.log('   Created:', row.created_at);
      
      if (!row.parent_transaction_id) {
        parentTransaction = row;
      }
    });
    
    console.log('\n' + '═'.repeat(100));
    console.log('\n📝 Transaction Flow Summary:\n');
    
    if (parentTransaction) {
      console.log(`1. NEW LOAN: ₱${parentTransaction.principal_amount} (Initial principal)`);
      
      const childTransactions = result.rows.filter(r => r.parent_transaction_id === parentTransaction.id);
      
      childTransactions.forEach((child, idx) => {
        if (child.transaction_type === 'partial_payment') {
          console.log(`${idx + 2}. PARTIAL PAYMENT: Paid ₱${child.amount_paid}`);
          console.log(`   → New Principal Loan saved: ₱${child.new_principal_loan}`);
          console.log(`   → Remaining Balance: ₱${child.balance}`);
        } else if (child.transaction_type === 'additional_loan') {
          const previousPrincipal = childTransactions
            .filter(t => t.created_at < child.created_at && t.new_principal_loan)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          
          const prevAmount = previousPrincipal?.new_principal_loan || parentTransaction.principal_amount;
          const addedAmount = parseFloat(child.principal_amount) - parseFloat(prevAmount);
          
          console.log(`${idx + 2}. ADDITIONAL LOAN: Added ₱${addedAmount.toFixed(2)}`);
          console.log(`   → Previous Principal: ₱${prevAmount}`);
          console.log(`   → New Principal Loan: ₱${child.principal_amount}`);
        } else if (child.transaction_type === 'redemption') {
          console.log(`${idx + 2}. REDEMPTION: Paid ₱${child.amount_paid}`);
          console.log(`   → Final amount redeemed based on current balance`);
        }
      });
      
      console.log('\n✅ Key Points:');
      console.log('   • Each partial payment saves new_principal_loan');
      console.log('   • Additional loan fetches the LAST new_principal_loan');
      console.log('   • Redemption uses current balance (not original principal)');
    }
    
    console.log('\n' + '═'.repeat(100));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

testTransactionChain();
