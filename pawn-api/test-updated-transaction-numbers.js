const { generateTicketNumber, getTransactionConfig } = require('./utils/transactionUtils');

async function testTransactionNumbers() {
  try {
    console.log('🧪 Testing Transaction Number Generation...\n');
    
    // Test getting current config
    const config = await getTransactionConfig();
    console.log('📋 Current Config:', config);
    
    // Test generating some ticket numbers
    console.log('\n🎫 Generating Ticket Numbers:');
    for (let i = 1; i <= 5; i++) {
      const ticketNumber = await generateTicketNumber(1);
      console.log(`${i}. ${ticketNumber}`);
    }
    
    console.log('\n✅ Transaction number generation test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testTransactionNumbers();