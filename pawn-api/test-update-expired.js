const { updateExpiredTransactions } = require('./utils/updateExpiredTransactions');

async function test() {
  console.log('🧪 Testing updateExpiredTransactions function...\n');
  
  try {
    const count = await updateExpiredTransactions();
    
    if (count > 0) {
      console.log(`\n✅ Successfully updated ${count} transaction(s)`);
    } else {
      console.log('\n✅ No transactions needed updating (all are current)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
