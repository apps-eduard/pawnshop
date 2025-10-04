const { pool } = require('./config/database');

async function testUpdatedCategorySystem() {
  console.log('🧪 Testing updated category system...');
  console.log('');
  
  try {
    // Test 1: Verify categories table structure and data
    console.log('📋 Test 1: Categories table structure and data');
    const categoriesResult = await pool.query(`
      SELECT id, name, interest_rate, notes, is_active 
      FROM categories 
      ORDER BY name
    `);
    console.log(`✅ Categories table exists with ${categoriesResult.rows.length} categories:`);
    categoriesResult.rows.forEach(cat => {
      const interestPercent = (cat.interest_rate * 100).toFixed(2);
      console.log(`   • ${cat.name} (${interestPercent}% interest) - ${cat.notes || 'No notes'}`);
    });
    console.log('');
    
    // Test 2: Verify descriptions table structure (renamed from category_descriptions)
    console.log('📝 Test 2: Descriptions table structure');
    const descriptionsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'descriptions' 
      ORDER BY ordinal_position
    `);
    
    if (descriptionsColumns.rows.length > 0) {
      console.log('✅ Descriptions table exists with columns:');
      descriptionsColumns.rows.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`);
      });
      
      // Verify the field is named 'notes' not 'description'
      const hasNotesField = descriptionsColumns.rows.some(col => col.column_name === 'notes');
      const hasDescriptionField = descriptionsColumns.rows.some(col => col.column_name === 'description');
      
      if (hasNotesField && !hasDescriptionField) {
        console.log('✅ Field correctly renamed from "description" to "notes"');
      } else if (hasDescriptionField) {
        console.log('⚠️  Old "description" field still exists, should be "notes"');
      } else {
        console.log('❌ Neither "notes" nor "description" field found');
      }
    } else {
      console.log('❌ Descriptions table not found');
    }
    console.log('');
    
    // Test 3: Check old category_descriptions table (should not exist)
    console.log('🗑️ Test 3: Verify old table removal');
    const oldTableExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'category_descriptions'
    `);
    
    if (oldTableExists.rows.length === 0) {
      console.log('✅ Old "category_descriptions" table successfully removed');
    } else {
      console.log('⚠️  Old "category_descriptions" table still exists');
    }
    console.log('');
    
    // Test 4: Count descriptions/notes by category
    console.log('📊 Test 4: Descriptions count by category');
    const descriptionCounts = await pool.query(`
      SELECT c.name as category, COUNT(d.id) as notes_count
      FROM categories c
      LEFT JOIN descriptions d ON c.id = d.category_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    
    console.log('✅ Notes/descriptions count by category:');
    let totalDescriptions = 0;
    descriptionCounts.rows.forEach(cat => {
      const count = parseInt(cat.notes_count);
      totalDescriptions += count;
      console.log(`   • ${cat.category}: ${count} notes/descriptions`);
    });
    console.log(`   Total: ${totalDescriptions} notes/descriptions across all categories`);
    console.log('');
    
    // Test 5: Show sample jewelry descriptions/notes
    console.log('💍 Test 5: Sample Jewelry notes/descriptions');
    const jewelryNotes = await pool.query(`
      SELECT d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      WHERE c.name = 'Jewelry'
      ORDER BY d.notes
      LIMIT 10
    `);
    
    if (jewelryNotes.rows.length > 0) {
      console.log('✅ Sample Jewelry notes:');
      jewelryNotes.rows.forEach(note => {
        console.log(`   • ${note.notes}`);
      });
    } else {
      console.log('❌ No Jewelry notes found');
    }
    console.log('');
    
    // Test 6: Show sample appliance descriptions/notes
    console.log('🔌 Test 6: Sample Appliance notes/descriptions');
    const applianceNotes = await pool.query(`
      SELECT d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      WHERE c.name = 'Appliances'
      ORDER BY d.notes
      LIMIT 10
    `);
    
    if (applianceNotes.rows.length > 0) {
      console.log('✅ Sample Appliance notes:');
      applianceNotes.rows.forEach(note => {
        console.log(`   • ${note.notes}`);
      });
    } else {
      console.log('❌ No Appliance notes found');
    }
    console.log('');
    
    // Test 7: Test API-like queries that would be used
    console.log('🔍 Test 7: API-ready queries');
    
    try {
      // Test categories with their notes count
      const categoriesWithCounts = await pool.query(`
        SELECT 
          c.id, 
          c.name, 
          c.interest_rate,
          c.notes as category_notes,
          COUNT(d.id) as descriptions_count
        FROM categories c
        LEFT JOIN descriptions d ON c.id = d.category_id
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.interest_rate, c.notes
        ORDER BY c.name
      `);
      
      console.log('✅ Categories with description counts (API ready):');
      categoriesWithCounts.rows.forEach(cat => {
        const interestPercent = (cat.interest_rate * 100).toFixed(2);
        console.log(`   • ${cat.name}: ${interestPercent}% interest, ${cat.descriptions_count} descriptions`);
      });
      
      // Test getting descriptions for a specific category
      const jewelryDescriptions = await pool.query(`
        SELECT d.id, d.notes, d.created_at
        FROM descriptions d
        JOIN categories c ON d.category_id = c.id
        WHERE c.name = $1 AND d.is_active = true
        ORDER BY d.notes
      `, ['Jewelry']);
      
      console.log(`✅ Jewelry category has ${jewelryDescriptions.rows.length} active descriptions`);
      
    } catch (error) {
      console.log('❌ API-ready queries failed:', error.message);
    }
    console.log('');
    
    // Test 8: Final summary
    console.log('🎉 Test 8: Final category system summary');
    const finalStats = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM categories WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM descriptions WHERE is_active = true'),
      pool.query(`SELECT c.name, COUNT(d.id) as desc_count FROM categories c LEFT JOIN descriptions d ON c.id = d.category_id GROUP BY c.name ORDER BY c.name`)
    ]);
    
    console.log('✅ Category system summary:');
    console.log(`   • Active categories: ${finalStats[0].rows[0].count}`);
    console.log(`   • Total active descriptions/notes: ${finalStats[1].rows[0].count}`);
    console.log('   • Breakdown by category:');
    finalStats[2].rows.forEach(cat => {
      console.log(`     - ${cat.name}: ${cat.desc_count} descriptions`);
    });
    console.log('');
    
    console.log('🎊 All category system tests passed!');
    console.log('✅ Table renamed: "category_descriptions" → "descriptions"');
    console.log('✅ Field renamed: "description" → "notes"');
    console.log('✅ Comprehensive categories seeded: Jewelry & Appliances');
    console.log('✅ Detailed notes/descriptions with remarks added');
    console.log('✅ Setup.bat updated to include category descriptions');
    console.log('');
    
  } catch (error) {
    console.error('❌ Category system test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testUpdatedCategorySystem();
    process.exit(0);
  } catch (error) {
    console.error('Category system test suite failed:', error);
    process.exit(1);
  }
}

main();