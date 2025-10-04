const { pool } = require('./config/database');

async function seedItemDescriptions() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Seeding comprehensive item descriptions for Jewelry and Appliances...');
    
    await client.query('BEGIN');
    
    // Get category IDs
    const categories = await client.query('SELECT id, name FROM categories ORDER BY name');
    const categoryMap = new Map();
    categories.rows.forEach(cat => {
      categoryMap.set(cat.name, cat.id);
    });
    
    console.log('📋 Found categories:');
    categoryMap.forEach((id, name) => {
      console.log(`   • ${name}: ID ${id}`);
    });
    
    // Clear existing descriptions to avoid duplicates
    console.log('🧹 Clearing existing descriptions...');
    await client.query('DELETE FROM descriptions');
    
    // Jewelry descriptions - comprehensive list for user selection
    const jewelryDescriptions = [
      // Gold Rings
      '21K Gold Wedding Ring',
      '18K Gold Wedding Ring',
      '14K Gold Wedding Ring',
      '21K Gold Engagement Ring with Diamond',
      '18K Gold Engagement Ring with Diamond',
      '21K Gold Plain Ring',
      '18K Gold Plain Ring',
      '14K Gold Plain Ring',
      '21K Gold Ring with Stone',
      '18K Gold Ring with Stone',
      '21K Gold Signet Ring',
      '18K Gold Class Ring',
      
      // Gold Necklaces
      '21K Gold Chain Necklace',
      '18K Gold Chain Necklace',
      '14K Gold Chain Necklace',
      '21K Gold Necklace with Pendant',
      '18K Gold Necklace with Pendant',
      '21K Gold Cross Necklace',
      '18K Gold Cross Necklace',
      '21K Gold Heart Necklace',
      '18K Gold Heart Necklace',
      '21K Gold Pearl Necklace',
      '18K Gold Pearl Necklace',
      
      // Gold Bracelets
      '21K Gold Bracelet',
      '18K Gold Bracelet',
      '14K Gold Bracelet',
      '21K Gold Bangle',
      '18K Gold Bangle',
      '21K Gold Tennis Bracelet',
      '18K Gold Tennis Bracelet',
      '21K Gold Charm Bracelet',
      '18K Gold Charm Bracelet',
      
      // Gold Earrings
      '21K Gold Stud Earrings',
      '18K Gold Stud Earrings',
      '14K Gold Stud Earrings',
      '21K Gold Hoop Earrings',
      '18K Gold Hoop Earrings',
      '21K Gold Drop Earrings',
      '18K Gold Drop Earrings',
      '21K Gold Chandelier Earrings',
      '18K Gold Chandelier Earrings',
      
      // Silver Jewelry
      'Sterling Silver Ring',
      'Sterling Silver Necklace',
      'Sterling Silver Bracelet',
      'Sterling Silver Earrings',
      'Silver Chain Necklace',
      'Silver Cross Necklace',
      'Silver Bangle',
      'Silver Charm Bracelet',
      
      // Watches
      'Gold Watch - Men\'s',
      'Gold Watch - Women\'s',
      'Diamond Watch',
      'Luxury Brand Watch',
      'Vintage Gold Watch',
      'Gold Pocket Watch',
      
      // Diamond Jewelry
      'Diamond Ring',
      'Diamond Earrings',
      'Diamond Necklace',
      'Diamond Bracelet',
      'Diamond Tennis Bracelet',
      
      // Traditional Filipino Jewelry
      'Gold Rosary',
      'Gold Religious Medal',
      'Traditional Gold Anklet',
      'Gold Barong Tagalog Buttons',
      'Gold Tribal Jewelry',
      
      // Gemstone Jewelry
      'Gold Ring with Ruby',
      'Gold Ring with Sapphire',
      'Gold Ring with Emerald',
      'Gold Necklace with Gemstone',
      'Pearl Earrings',
      'Pearl Bracelet',
      
      // Vintage/Antique
      'Antique Gold Ring',
      'Vintage Gold Necklace',
      'Heirloom Jewelry',
      'Art Deco Jewelry',
      'Victorian Era Jewelry'
    ];
    
    // Appliances descriptions - comprehensive list for user selection
    const applianceDescriptions = [
      // Television
      '32" LED TV',
      '43" LED TV',
      '50" LED TV',
      '55" LED TV',
      '65" LED TV',
      '75" LED TV',
      '32" Smart TV',
      '43" Smart TV',
      '50" Smart TV',
      '55" Smart TV',
      '65" Smart TV',
      '75" Smart TV',
      '32" 4K TV',
      '43" 4K TV',
      '50" 4K TV',
      '55" 4K TV',
      '65" 4K TV',
      
      // Refrigerators
      'Single Door Refrigerator',
      'Double Door Refrigerator',
      'Inverter Refrigerator',
      'No Frost Refrigerator',
      'Mini Refrigerator',
      'Side by Side Refrigerator',
      'French Door Refrigerator',
      'Top Freezer Refrigerator',
      'Bottom Freezer Refrigerator',
      
      // Washing Machines
      'Top Load Washing Machine',
      'Front Load Washing Machine',
      'Semi Automatic Washing Machine',
      'Fully Automatic Washing Machine',
      'Inverter Washing Machine',
      'Twin Tub Washing Machine',
      '7kg Washing Machine',
      '8kg Washing Machine',
      '9kg Washing Machine',
      '10kg Washing Machine',
      
      // Air Conditioners
      '1HP Window Type Aircon',
      '1.5HP Window Type Aircon',
      '2HP Window Type Aircon',
      '1HP Split Type Aircon',
      '1.5HP Split Type Aircon',
      '2HP Split Type Aircon',
      '2.5HP Split Type Aircon',
      'Inverter Aircon 1HP',
      'Inverter Aircon 1.5HP',
      'Inverter Aircon 2HP',
      'Ceiling Cassette Aircon',
      'Floor Standing Aircon',
      
      // Kitchen Appliances
      'Electric Rice Cooker 1.8L',
      'Electric Rice Cooker 2.8L',
      'Electric Rice Cooker 4.2L',
      'Gas Range 2 Burner',
      'Gas Range 3 Burner',
      'Gas Range 4 Burner',
      'Electric Stove 1 Burner',
      'Electric Stove 2 Burner',
      'Induction Cooker Single',
      'Induction Cooker Double',
      'Microwave Oven 20L',
      'Microwave Oven 25L',
      'Microwave Oven 30L',
      'Convection Microwave',
      'Oven Toaster 9L',
      'Oven Toaster 19L',
      'Oven Toaster 42L',
      
      // Small Kitchen Appliances
      'Blender 1.5L',
      'Blender 2L',
      'Food Processor',
      'Stand Mixer',
      'Hand Mixer',
      'Electric Kettle 1.7L',
      'Electric Kettle 2L',
      'Coffee Maker Drip Type',
      'Espresso Machine',
      'Juicer',
      'Slow Juicer',
      'Air Fryer 2L',
      'Air Fryer 3.5L',
      'Air Fryer 5.5L',
      'Deep Fryer',
      'Electric Grill',
      'Sandwich Maker',
      'Waffle Maker',
      'Bread Maker',
      'Pressure Cooker Electric',
      'Multi Cooker',
      'Slow Cooker',
      
      // Fans and Cooling
      'Stand Fan 16"',
      'Stand Fan 18"',
      'Ceiling Fan 42"',
      'Ceiling Fan 48"',
      'Ceiling Fan 52"',
      'Tower Fan',
      'Wall Fan',
      'Industrial Fan',
      'Exhaust Fan',
      
      // Cleaning Appliances
      'Vacuum Cleaner Canister',
      'Vacuum Cleaner Upright',
      'Robotic Vacuum',
      'Wet and Dry Vacuum',
      'Steam Mop',
      'Floor Polisher',
      
      // Laundry and Garment Care
      'Electric Iron Dry',
      'Steam Iron',
      'Garment Steamer',
      'Clothes Dryer',
      
      // Water and Beverages
      'Water Dispenser Hot and Cold',
      'Water Dispenser Bottom Load',
      'Water Dispenser Top Load',
      'Electric Water Heater',
      'Instant Water Heater',
      'Water Purifier',
      
      // Audio and Entertainment
      'Sound System',
      'Home Theater System',
      'Bluetooth Speaker',
      'Karaoke Machine',
      'DVD Player',
      'Blu-ray Player',
      
      // Others
      'Electric Fan Heater',
      'Humidifier',
      'Dehumidifier',
      'Air Purifier',
      'CCTV System',
      'Electric Lawn Mower'
    ];
    
    // Insert Jewelry descriptions
    const jewelryId = categoryMap.get('Jewelry');
    if (jewelryId) {
      console.log(`💍 Adding ${jewelryDescriptions.length} jewelry descriptions...`);
      for (const description of jewelryDescriptions) {
        await client.query(`
          INSERT INTO descriptions (category_id, notes, is_active, created_at, updated_at) 
          VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [jewelryId, description]);
      }
      console.log(`✅ Added ${jewelryDescriptions.length} jewelry descriptions`);
    }
    
    // Insert Appliances descriptions
    const appliancesId = categoryMap.get('Appliances');
    if (appliancesId) {
      console.log(`🔌 Adding ${applianceDescriptions.length} appliance descriptions...`);
      for (const description of applianceDescriptions) {
        await client.query(`
          INSERT INTO descriptions (category_id, notes, is_active, created_at, updated_at) 
          VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [appliancesId, description]);
      }
      console.log(`✅ Added ${applianceDescriptions.length} appliance descriptions`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 Item descriptions seeded successfully!');
    
    // Display summary
    const finalCounts = await client.query(`
      SELECT c.name as category, COUNT(d.id) as description_count
      FROM categories c
      LEFT JOIN descriptions d ON c.id = d.category_id
      WHERE d.is_active = true
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    
    console.log('📊 Final description counts:');
    let totalDescriptions = 0;
    finalCounts.rows.forEach(cat => {
      const count = parseInt(cat.description_count);
      totalDescriptions += count;
      console.log(`   • ${cat.category}: ${count} descriptions`);
    });
    console.log(`   Total: ${totalDescriptions} selectable descriptions`);
    
    // Show sample descriptions for each category
    console.log('');
    console.log('💍 Sample Jewelry descriptions (first 10):');
    const sampleJewelry = await client.query(`
      SELECT d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      WHERE c.name = 'Jewelry'
      ORDER BY d.notes
      LIMIT 10
    `);
    sampleJewelry.rows.forEach((desc, i) => {
      console.log(`   ${i + 1}. ${desc.notes}`);
    });
    
    console.log('');
    console.log('🔌 Sample Appliance descriptions (first 10):');
    const sampleAppliances = await client.query(`
      SELECT d.notes
      FROM descriptions d
      JOIN categories c ON d.category_id = c.id
      WHERE c.name = 'Appliances'
      ORDER BY d.notes
      LIMIT 10
    `);
    sampleAppliances.rows.forEach((desc, i) => {
      console.log(`   ${i + 1}. ${desc.notes}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding item descriptions:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await seedItemDescriptions();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed item descriptions:', error);
    process.exit(1);
  }
}

main();