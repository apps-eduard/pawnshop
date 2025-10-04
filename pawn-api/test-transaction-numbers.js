const { generateTicketNumber, getTransactionConfig } = require('./utils/transactionUtils');

async function testTransactionNumberGeneration() {
  try {
    console.log('🧪 Testing transaction number generation...');
    
    // Test getting config
    const config = await getTransactionConfig();
    console.log('📋 Current config:', config);
    
    // Test generating ticket numbers for different branches
    console.log('\n🎫 Generating ticket numbers...');
    
    for (let i = 1; i <= 3; i++) {
      const ticketNumber = await generateTicketNumber(1, 'MAIN');
      console.log(`Ticket ${i} (Branch 1, MAIN):`, ticketNumber);
    }
    
    for (let i = 1; i <= 2; i++) {
      const ticketNumber = await generateTicketNumber(2, 'BR02');
      console.log(`Ticket ${i} (Branch 2, BR02):`, ticketNumber);
    }
    
    console.log('\n✅ Transaction number generation test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

testTransactionNumberGeneration();