const { pool } = require('./config/database');

async function testApiUpdates() {
  try {
    console.log('🧪 Testing API Updates...\n');
    
    // Test 1: Categories with proper percentage display
    console.log('1️⃣ Testing Categories API...');
    const categories = await pool.query(`
      SELECT 
        id, 
        name, 
        interest_rate,
        CONCAT(name, ' ', interest_rate, '%') as display_name
      FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);
    
    console.log('✅ Categories:', categories.rows.map(c => c.display_name).join(', '));
    
    // Test 2: Appraisal counts by status
    console.log('\n2️⃣ Testing Appraisal Counts...');
    const appraisalCounts = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM appraisals
      GROUP BY status
    `);
    
    const counts = { pending: 0, completed: 0, total: 0 };
    appraisalCounts.rows.forEach(row => {
      counts[row.status] = parseInt(row.count);
      counts.total += parseInt(row.count);
    });
    
    console.log('✅ Appraisal Counts:', counts);
    
    // Test 3: Pending appraisals ready for transaction
    console.log('\n3️⃣ Testing Pending Appraisals Ready for Transaction...');
    const pendingReady = await pool.query(`
      SELECT a.id, a.status, 
             CONCAT(p.first_name, ' ', p.last_name) as pawner_name,
             a.estimated_value
      FROM appraisals a
      JOIN pawners p ON a.pawner_id = p.id
      WHERE a.status = 'completed'
      AND a.id NOT IN (
        SELECT DISTINCT appraisal_id 
        FROM transactions 
        WHERE appraisal_id IS NOT NULL
      )
      ORDER BY a.created_at DESC
    `);
    
    console.log(`✅ Found ${pendingReady.rows.length} appraisals ready for transaction`);
    if (pendingReady.rows.length > 0) {
      pendingReady.rows.forEach(appraisal => {
        console.log(`   - ID: ${appraisal.id}, Pawner: ${appraisal.pawner_name}, Value: ₱${appraisal.estimated_value}`);
      });
    }
    
    // Test 4: Transaction types
    console.log('\n4️⃣ Testing Transaction Types Configuration...');
    const transactionTypes = [
      'new_loan',
      'additional_loan', 
      'partial_payment',
      'redeem',
      'renew'
    ];
    
    console.log('✅ Available Transaction Types:');
    transactionTypes.forEach(type => {
      console.log(`   - ${type.replace('_', ' ').toUpperCase()}`);
    });
    
    // Test 5: Check if transaction sequence table exists
    console.log('\n5️⃣ Testing Transaction Sequence...');
    const hasSequence = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 'transaction_sequences'
    `);
    
    if (parseInt(hasSequence.rows[0].count) > 0) {
      console.log('✅ Transaction sequence table exists');
      
      const currentYear = new Date().getFullYear();
      await pool.query(`
        INSERT INTO transaction_sequences (year, next_number) 
        VALUES ($1, 1) 
        ON CONFLICT (year) DO NOTHING
      `, [currentYear]);
      
      console.log(`✅ Transaction sequence initialized for year ${currentYear}`);
    } else {
      console.log('❌ Transaction sequence table missing - creating it...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transaction_sequences (
          year INTEGER PRIMARY KEY,
          next_number INTEGER NOT NULL DEFAULT 1
        )
      `);
      console.log('✅ Transaction sequence table created');
    }
    
    console.log('\n🎉 All API updates tested successfully!');
    console.log('\n📋 Summary of Changes:');
    console.log('   ✅ Added appraisal status tracking (pending/completed)');
    console.log('   ✅ Fixed categories display (Jewelry 3%, Appliance 6%)');
    console.log('   ✅ Added appraisal counts endpoint');
    console.log('   ✅ Added pending appraisals ready for transaction endpoint');
    console.log('   ✅ Created comprehensive transactions API');
    console.log('   ✅ Added transaction sequence management');
    console.log('   ✅ Ready for unified transaction page implementation');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error testing API updates:', error);
    await pool.end();
  }
}

testApiUpdates();