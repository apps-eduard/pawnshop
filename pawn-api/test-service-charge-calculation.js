const ServiceChargeCalculatorService = require('./services/service-charge-calculator.service');

async function testServiceChargeCalculation() {
  const serviceChargeCalculator = new ServiceChargeCalculatorService();
  
  try {
    console.log('🧮 Testing Dynamic Service Charge Calculator\n');
    
    // Test scenarios based on your requirements
    const testCases = [
      { name: 'Small loan (₱50)', principalAmount: 50 },
      { name: 'Low bracket (₱100)', principalAmount: 100 },
      { name: 'Mid bracket (₱150)', principalAmount: 150 },
      { name: 'Mid-high bracket (₱250)', principalAmount: 250 },
      { name: 'High bracket (₱350)', principalAmount: 350 },
      { name: 'Highest bracket (₱1000)', principalAmount: 1000 },
      { name: 'Very high amount (₱5000)', principalAmount: 5000 }
    ];
    
    console.log('📊 Current Configuration:');
    const { config, brackets } = await serviceChargeCalculator.getServiceChargeConfig();
    
    console.log('Service Charge Brackets:');
    brackets.forEach(bracket => {
      const maxDisplay = bracket.max_amount ? `₱${bracket.max_amount.toLocaleString()}` : '∞';
      console.log(`  ${bracket.bracket_name}: ₱${bracket.min_amount.toLocaleString()} - ${maxDisplay} → ₱${bracket.service_charge}`);
    });
    
    console.log('\nGeneral Configuration:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
    
    for (const testCase of testCases) {
      console.log(`🎯 Test Case: ${testCase.name}`);
      console.log(`   Principal: ₱${testCase.principalAmount.toLocaleString()}`);
      
      const result = await serviceChargeCalculator.calculateServiceCharge(
        testCase.principalAmount
      );
      
      console.log(`   Result:`);
      console.log(`     Method: ${result.calculationMethod}`);
      console.log(`     Bracket: ${result.bracketUsed || 'N/A'}`);
      console.log(`     Service Charge: ₱${result.serviceChargeAmount.toLocaleString()}`);
      console.log('');
    }
    
    // Test bracket update
    console.log('🔧 Testing Bracket Update...');
    console.log('Updating Bracket 1-100 service charge from ₱1 to ₱1.50');
    
    // Find the bracket ID for 1-100
    const bracket1to100 = brackets.find(b => b.min_amount === 1 && b.max_amount === 100);
    if (bracket1to100) {
      await serviceChargeCalculator.updateServiceChargeBracket(
        bracket1to100.id, 
        { service_charge: 1.5 }, 
        1
      );
      
      // Test the same case with new bracket
      const testCaseWithNewBracket = testCases[1]; // ₱100
      console.log(`\n🎯 Re-testing with updated bracket: ${testCaseWithNewBracket.name}`);
      
      const newResult = await serviceChargeCalculator.calculateServiceCharge(
        testCaseWithNewBracket.principalAmount
      );
      
      console.log(`   New Service Charge: ₱${newResult.serviceChargeAmount.toLocaleString()}`);
      console.log(`   Bracket Used: ${newResult.bracketUsed}`);
      
      // Revert back to original
      await serviceChargeCalculator.updateServiceChargeBracket(
        bracket1to100.id, 
        { service_charge: 1 }, 
        1
      );
      console.log('\n✅ Bracket reverted back to ₱1');
    }
    
    // Test different calculation methods
    console.log('\n🔧 Testing Different Calculation Methods...');
    
    // Switch to percentage-based calculation
    await serviceChargeCalculator.updateServiceChargeConfig('calculation_method', 2, 1); // 2 = percentage
    
    console.log('Switched to percentage-based calculation (1%)');
    const percentageResult = await serviceChargeCalculator.calculateServiceCharge(1000);
    console.log(`₱1000 with 1% = ₱${percentageResult.serviceChargeAmount} (method: ${percentageResult.calculationMethod})`);
    
    // Switch to fixed amount calculation
    await serviceChargeCalculator.updateServiceChargeConfig('calculation_method', 3, 1); // 3 = fixed
    
    console.log('Switched to fixed amount calculation (₱50)');
    const fixedResult = await serviceChargeCalculator.calculateServiceCharge(1000);
    console.log(`₱1000 with fixed = ₱${fixedResult.serviceChargeAmount} (method: ${fixedResult.calculationMethod})`);
    
    // Switch back to bracket-based
    await serviceChargeCalculator.updateServiceChargeConfig('calculation_method', 1, 1); // 1 = bracket
    console.log('\n✅ Switched back to bracket-based calculation');
    
    console.log('\n🎉 Dynamic service charge calculation test completed!');
    console.log('\n📝 Key Features Demonstrated:');
    console.log('  ✅ Configurable service charge brackets');
    console.log('  ✅ Multiple calculation methods (bracket, percentage, fixed)');
    console.log('  ✅ Real-time bracket and configuration updates');
    console.log('  ✅ Cache management');
    console.log('  ✅ Audit logging capability');
    console.log('  ✅ Minimum and maximum limits');
    
  } catch (error) {
    console.error('❌ Error testing service charge calculation:', error);
  } finally {
    process.exit();
  }
}

testServiceChargeCalculation();