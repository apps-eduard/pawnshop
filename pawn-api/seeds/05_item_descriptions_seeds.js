/**
 * Item Descriptions Seed
 * Common item descriptions for Jewelry and Appliances
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get category IDs
  const jewelryCategory = await knex('categories').where('name', 'Jewelry').first();
  const appliancesCategory = await knex('categories').where('name', 'Appliances').first();

  const descriptions = [];

  // ===== JEWELRY DESCRIPTIONS =====
  if (jewelryCategory) {
    const jewelryDescriptions = [
      // Gold Items
      { name: 'Gold Ring', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Necklace', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Bracelet', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Earrings', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Chain', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Pendant', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Bangle', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Anklet', category_id: jewelryCategory.id, is_active: true },
      { name: 'Gold Watch', category_id: jewelryCategory.id, is_active: true },
      
      // Diamond/Stone Items
      { name: 'Diamond Ring', category_id: jewelryCategory.id, is_active: true },
      { name: 'Diamond Necklace', category_id: jewelryCategory.id, is_active: true },
      { name: 'Diamond Earrings', category_id: jewelryCategory.id, is_active: true },
      { name: 'Pearl Necklace', category_id: jewelryCategory.id, is_active: true },
      { name: 'Pearl Earrings', category_id: jewelryCategory.id, is_active: true },
      
      // Sets
      { name: 'Jewelry Set (Necklace + Earrings)', category_id: jewelryCategory.id, is_active: true },
      { name: 'Wedding Ring Set', category_id: jewelryCategory.id, is_active: true },
      { name: 'Bridal Set', category_id: jewelryCategory.id, is_active: true },
      
      // Silver Items
      { name: 'Silver Ring', category_id: jewelryCategory.id, is_active: true },
      { name: 'Silver Necklace', category_id: jewelryCategory.id, is_active: true },
      { name: 'Silver Bracelet', category_id: jewelryCategory.id, is_active: true },
      { name: 'Silver Earrings', category_id: jewelryCategory.id, is_active: true },
      
      // Other
      { name: 'Rosary (Gold)', category_id: jewelryCategory.id, is_active: true },
      { name: 'Rosary (Silver)', category_id: jewelryCategory.id, is_active: true },
      { name: 'Religious Pendant', category_id: jewelryCategory.id, is_active: true },
      { name: 'Engagement Ring', category_id: jewelryCategory.id, is_active: true }
    ];
    descriptions.push(...jewelryDescriptions);
  }

  // ===== APPLIANCES DESCRIPTIONS =====
  if (appliancesCategory) {
    const appliancesDescriptions = [
      // Mobile Devices
      { name: 'Smartphone', category_id: appliancesCategory.id, is_active: true },
      { name: 'iPhone', category_id: appliancesCategory.id, is_active: true },
      { name: 'Samsung Phone', category_id: appliancesCategory.id, is_active: true },
      { name: 'Tablet', category_id: appliancesCategory.id, is_active: true },
      { name: 'iPad', category_id: appliancesCategory.id, is_active: true },
      
      // Computers
      { name: 'Laptop', category_id: appliancesCategory.id, is_active: true },
      { name: 'Desktop Computer', category_id: appliancesCategory.id, is_active: true },
      { name: 'Macbook', category_id: appliancesCategory.id, is_active: true },
      
      // Kitchen Appliances
      { name: 'Refrigerator', category_id: appliancesCategory.id, is_active: true },
      { name: 'Microwave Oven', category_id: appliancesCategory.id, is_active: true },
      { name: 'Rice Cooker', category_id: appliancesCategory.id, is_active: true },
      { name: 'Electric Stove', category_id: appliancesCategory.id, is_active: true },
      { name: 'Gas Stove', category_id: appliancesCategory.id, is_active: true },
      { name: 'Blender', category_id: appliancesCategory.id, is_active: true },
      { name: 'Electric Kettle', category_id: appliancesCategory.id, is_active: true },
      { name: 'Coffee Maker', category_id: appliancesCategory.id, is_active: true },
      { name: 'Toaster', category_id: appliancesCategory.id, is_active: true },
      
      // Home Appliances
      { name: 'Washing Machine', category_id: appliancesCategory.id, is_active: true },
      { name: 'Electric Fan', category_id: appliancesCategory.id, is_active: true },
      { name: 'Air Conditioner', category_id: appliancesCategory.id, is_active: true },
      { name: 'Electric Iron', category_id: appliancesCategory.id, is_active: true },
      { name: 'Vacuum Cleaner', category_id: appliancesCategory.id, is_active: true },
      { name: 'Water Dispenser', category_id: appliancesCategory.id, is_active: true },
      
      // Entertainment
      { name: 'Television', category_id: appliancesCategory.id, is_active: true },
      { name: 'LED TV', category_id: appliancesCategory.id, is_active: true },
      { name: 'Smart TV', category_id: appliancesCategory.id, is_active: true },
      { name: 'DVD Player', category_id: appliancesCategory.id, is_active: true },
      { name: 'Sound System', category_id: appliancesCategory.id, is_active: true },
      { name: 'Speaker', category_id: appliancesCategory.id, is_active: true },
      
      // Gaming
      { name: 'PlayStation', category_id: appliancesCategory.id, is_active: true },
      { name: 'Xbox', category_id: appliancesCategory.id, is_active: true },
      { name: 'Nintendo Switch', category_id: appliancesCategory.id, is_active: true },
      
      // Cameras
      { name: 'Digital Camera', category_id: appliancesCategory.id, is_active: true },
      { name: 'DSLR Camera', category_id: appliancesCategory.id, is_active: true },
      { name: 'Action Camera', category_id: appliancesCategory.id, is_active: true },
      
      // Audio
      { name: 'Headphones', category_id: appliancesCategory.id, is_active: true },
      { name: 'Earphones', category_id: appliancesCategory.id, is_active: true },
      { name: 'Bluetooth Speaker', category_id: appliancesCategory.id, is_active: true },
      
      // Tools
      { name: 'Power Drill', category_id: appliancesCategory.id, is_active: true },
      { name: 'Angle Grinder', category_id: appliancesCategory.id, is_active: true },
      { name: 'Sewing Machine', category_id: appliancesCategory.id, is_active: true }
    ];
    descriptions.push(...appliancesDescriptions);
  }

  // Insert all descriptions (check if already exists first)
  for (const description of descriptions) {
    const exists = await knex('descriptions')
      .where({ name: description.name, category_id: description.category_id })
      .first();
    
    if (!exists) {
      await knex('descriptions').insert(description);
    }
  }

  console.log('✅ Item descriptions seeded successfully!');
  console.log(`   - ${descriptions.length} descriptions added`);
  console.log(`   - Jewelry: Gold, Diamond, Silver items (rings, necklaces, earrings, etc.)`);
  console.log(`   - Appliances: Smartphones, Laptops, Kitchen, Home, Entertainment items`);
};
