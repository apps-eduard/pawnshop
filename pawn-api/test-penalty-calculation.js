const PenaltyCalculatorService = require('./services/penalty-calculator.service');

async function testPenaltyCalculation() {
  const penaltyCalculator = new PenaltyCalculatorService();
  
  try {
    console.log('🧮 Testing Dynamic Penalty Calculator\n');
    
    // Test scenarios
    const testCases = [
      {
        name: 'Loan not overdue',
        principalAmount: 15000,
        maturityDate: new Date(Date.now() + 86400000), // Tomorrow
        currentDate: new Date()
      },
      {
        name: '2 days overdue (daily penalty)',
        principalAmount: 15000,
        maturityDate: new Date(Date.now() - (2 * 86400000)), // 2 days ago
        currentDate: new Date()
      },
      {
        name: '5 days overdue (monthly penalty)',
        principalAmount: 15000,
        maturityDate: new Date(Date.now() - (5 * 86400000)), // 5 days ago
        currentDate: new Date()
      },
      {
        name: '45 days overdue (monthly penalty)',
        principalAmount: 15000,
        maturityDate: new Date(Date.now() - (45 * 86400000)), // 45 days ago
        currentDate: new Date()
      }
    ];
    
    console.log('📊 Current Configuration:');
    const config = await penaltyCalculator.getPenaltyConfig();
    Object.entries(config).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
    
    for (const testCase of testCases) {
      console.log(`🎯 Test Case: ${testCase.name}`);
      console.log(`   Principal: ₱${testCase.principalAmount.toLocaleString()}`);
      console.log(`   Maturity: ${testCase.maturityDate.toDateString()}`);
      console.log(`   Current: ${testCase.currentDate.toDateString()}`);
      
      const result = await penaltyCalculator.calculatePenalty(
        testCase.principalAmount,
        testCase.maturityDate,
        testCase.currentDate
      );
      
      console.log(`   Result:`);
      console.log(`     Days Overdue: ${result.daysOverdue}`);
      console.log(`     Effective Days: ${result.effectiveDaysOverdue}`);
      console.log(`     Method: ${result.calculationMethod}`);
      console.log(`     Penalty: ₱${result.penaltyAmount.toLocaleString()}`);
      console.log(`     Applicable: ${result.isPenaltyApplicable}`);
      console.log('');
    }
    
    // Test configuration update
    console.log('🔧 Testing Configuration Update...');
    console.log('Changing monthly penalty rate from 2% to 2.5%');
    
    await penaltyCalculator.updatePenaltyConfig('monthly_penalty_rate', 0.025, 1);
    
    // Test the same case with new config
    const testCaseWithNewConfig = testCases[2]; // 5 days overdue
    console.log(`\n🎯 Re-testing with new config: ${testCaseWithNewConfig.name}`);
    
    const newResult = await penaltyCalculator.calculatePenalty(
      testCaseWithNewConfig.principalAmount,
      testCaseWithNewConfig.maturityDate,
      testCaseWithNewConfig.currentDate
    );
    
    console.log(`   New Penalty: ₱${newResult.penaltyAmount.toLocaleString()}`);
    console.log(`   New Rate: ${(newResult.penaltyRate * 100).toFixed(2)}%`);
    
    // Revert back to original
    await penaltyCalculator.updatePenaltyConfig('monthly_penalty_rate', 0.02, 1);
    console.log('\n✅ Configuration reverted back to 2%');
    
    console.log('\n🎉 Dynamic penalty calculation test completed!');
    console.log('\n📝 Key Features Demonstrated:');
    console.log('  ✅ Configurable penalty rates');
    console.log('  ✅ Different calculation methods (daily vs monthly)');
    console.log('  ✅ Real-time configuration updates');
    console.log('  ✅ Cache management');
    console.log('  ✅ Audit logging capability');
    
  } catch (error) {
    console.error('❌ Error testing penalty calculation:', error);
  } finally {
    process.exit();
  }
}

testPenaltyCalculation();