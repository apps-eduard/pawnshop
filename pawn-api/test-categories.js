const { pool } = require('./config/database');

async function testCategoriesQuery() {
  try {
    console.log('🧪 Testing categories query with descriptions...');
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.interest_rate,
        c.notes,
        json_agg(
          json_build_object(
            'id', cd.id,
            'description', cd.description
          ) ORDER BY cd.description
        ) FILTER (WHERE cd.id IS NOT NULL) as descriptions
      FROM categories c
      LEFT JOIN category_descriptions cd ON c.id = cd.category_id AND cd.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.interest_rate, c.notes
      ORDER BY c.name
    `);
    
    console.log('✅ Query successful! Results:', result.rows.length, 'categories');
    
    result.rows.forEach((cat, i) => {
      console.log(`📋 Category ${i+1}: ${cat.name}`);
      console.log(`   Interest Rate: ${cat.interest_rate}%`);
      console.log(`   Notes: ${cat.notes}`);
      console.log(`   Descriptions: ${cat.descriptions ? cat.descriptions.length : 0} items`);
      if (cat.descriptions && cat.descriptions.length > 0) {
        cat.descriptions.slice(0, 3).forEach(desc => {
          console.log(`     - ${desc.description}`);
        });
        if (cat.descriptions.length > 3) {
          console.log(`     ... and ${cat.descriptions.length - 3} more`);
        }
      }
      console.log('');
    });
    
    await pool.end();
    console.log('🎉 Categories API should now work properly!');
    
  } catch (error) {
    console.error('❌ Query failed:', error);
    await pool.end();
  }
}

testCategoriesQuery();