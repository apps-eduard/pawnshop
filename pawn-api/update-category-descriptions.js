const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '123',
  database: 'pawnshop_db',
  port: 5432
});

async function updateCategoryDescriptions() {
  try {
    console.log('🗑️ Clearing existing category descriptions...');
    
    // Clear existing category descriptions
    await pool.query('DELETE FROM category_descriptions');
    
    console.log('📝 Inserting new category descriptions...');
    
    // Insert new category descriptions
    const jewelryDescriptions = [
      '21K Gold Ring', '18K Gold Ring', '14K Gold Ring',
      '21K Gold Necklace', '18K Gold Necklace', '14K Gold Necklace',
      '21K Gold Bracelet', '18K Gold Bracelet', '14K Gold Bracelet',
      '21K Gold Earrings', '18K Gold Earrings', '14K Gold Earrings',
      'Sterling Silver Ring', 'Sterling Silver Necklace', 'Sterling Silver Bracelet', 'Sterling Silver Earrings',
      '21K Wedding Ring', '18K Wedding Ring', '21K Engagement Ring', '18K Engagement Ring',
      'Gold Chain', 'Gold Pendant', 'Gold Watch', 'Diamond Ring', 'Pearl Necklace'
    ];
    
    const applianceDescriptions = [
      '32" LED TV', '43" LED TV', '50" LED TV', '55" LED TV', '65" LED TV', '75" LED TV',
      'Inverter Refrigerator', 'No Frost Refrigerator', 'Mini Refrigerator',
      'Top Load Washing Machine', 'Front Load Washing Machine', 'Semi-Automatic Washing Machine',
      'Window Type Aircon', 'Split Type Aircon', 'Inverter Aircon',
      'Stand Fan', 'Ceiling Fan', 'Tower Fan',
      'Electric Rice Cooker', 'Gas Range', 'Electric Stove',
      'Microwave Oven', 'Oven Toaster', 'Blender', 'Food Processor',
      'Electric Kettle', 'Coffee Maker', 'Electric Iron', 'Steam Iron',
      'Vacuum Cleaner', 'Water Dispenser', 'Electric Grill', 'Induction Cooker',
      'Deep Fryer', 'Dishwasher'
    ];
    
    // Get category IDs
    const categories = await pool.query('SELECT id, name FROM categories');
    const jewelryId = categories.rows.find(c => c.name === 'Jewelry')?.id;
    const appliancesId = categories.rows.find(c => c.name === 'Appliances')?.id;
    
    // Insert jewelry descriptions
    for (const description of jewelryDescriptions) {
      await pool.query('INSERT INTO category_descriptions (category_id, description) VALUES ($1, $2)', [jewelryId, description]);
    }
    
    // Insert appliance descriptions
    for (const description of applianceDescriptions) {
      await pool.query('INSERT INTO category_descriptions (category_id, description) VALUES ($1, $2)', [appliancesId, description]);
    }
    
    console.log('✅ Category descriptions updated successfully!');
    
    // Show the results
    const result = await pool.query(`
      SELECT c.name as category_name, cd.description
      FROM category_descriptions cd
      JOIN categories c ON cd.category_id = c.id
      ORDER BY c.name, cd.description
    `);
    
    console.log(`\n📊 Total descriptions: ${result.rows.length}`);
    
    const jewelryCount = result.rows.filter(r => r.category_name === 'Jewelry').length;
    const appliancesCount = result.rows.filter(r => r.category_name === 'Appliances').length;
    
    console.log(`💍 Jewelry descriptions: ${jewelryCount}`);
    console.log(`🔌 Appliances descriptions: ${appliancesCount}`);
    
    console.log('\n📝 Sample descriptions:');
    console.log('Jewelry:', result.rows.filter(r => r.category_name === 'Jewelry').slice(0, 5).map(r => r.description).join(', '));
    console.log('Appliances:', result.rows.filter(r => r.category_name === 'Appliances').slice(0, 5).map(r => r.description).join(', '));
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateCategoryDescriptions();