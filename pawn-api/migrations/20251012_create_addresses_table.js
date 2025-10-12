/**
 * Migration: Create addresses table and migrate data
 * Date: 2025-10-12
 * Description: Create centralized addresses table with city_id, barangay_id, and address_details
 */

exports.up = async function(knex) {
  // =============================================
  // Step 1: Create addresses table
  // =============================================
  await knex.schema.createTable('addresses', (table) => {
    table.increments('id').primary();
    table.integer('city_id').notNullable()
      .references('id').inTable('cities')
      .onDelete('RESTRICT');
    table.integer('barangay_id').notNullable()
      .references('id').inTable('barangays')
      .onDelete('RESTRICT');
    table.text('address_details');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add indexes
    table.index('city_id', 'idx_addresses_city_id');
    table.index('barangay_id', 'idx_addresses_barangay_id');
    table.index('is_active', 'idx_addresses_is_active');
  });

  console.log('✅ Created addresses table');

  // =============================================
  // Step 2: Migrate pawners data to addresses table
  // =============================================
  
  // Get all pawners with city and barangay
  const pawners = await knex('pawners')
    .select('id', 'city_id', 'barangay_id', 'house_number', 'street')
    .whereNotNull('city_id')
    .whereNotNull('barangay_id');

  console.log(`Found ${pawners.length} pawners with address data`);

  // Create unique addresses
  const uniqueAddresses = new Map();
  
  for (const pawner of pawners) {
    const addressDetails = [pawner.house_number, pawner.street]
      .filter(Boolean)
      .join(', ')
      .trim() || 'No address details';
    
    const key = `${pawner.city_id}-${pawner.barangay_id}-${addressDetails}`;
    
    if (!uniqueAddresses.has(key)) {
      uniqueAddresses.set(key, {
        city_id: pawner.city_id,
        barangay_id: pawner.barangay_id,
        address_details: addressDetails
      });
    }
  }

  // Insert unique addresses
  if (uniqueAddresses.size > 0) {
    const addressesToInsert = Array.from(uniqueAddresses.values());
    await knex('addresses').insert(addressesToInsert);
    console.log(`✅ Inserted ${addressesToInsert.length} unique addresses`);
  }

  // =============================================
  // Step 3: Add address_id to pawners table
  // =============================================
  
  await knex.schema.table('pawners', (table) => {
    table.integer('address_id')
      .references('id').inTable('addresses');
    table.index('address_id', 'idx_pawners_address_id');
  });

  console.log('✅ Added address_id column to pawners table');

  // =============================================
  // Step 4: Update pawners with their address_id
  // =============================================
  
  // Get all addresses
  const addresses = await knex('addresses').select('*');
  
  let updatedCount = 0;
  for (const pawner of pawners) {
    const addressDetails = [pawner.house_number, pawner.street]
      .filter(Boolean)
      .join(', ')
      .trim() || 'No address details';
    
    const address = addresses.find(a => 
      a.city_id === pawner.city_id &&
      a.barangay_id === pawner.barangay_id &&
      a.address_details === addressDetails
    );
    
    if (address) {
      await knex('pawners')
        .where('id', pawner.id)
        .update({ address_id: address.id });
      updatedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} pawners with address_id`);

  // =============================================
  // Step 5: Add address_id to employees table
  // =============================================
  
  await knex.schema.table('employees', (table) => {
    table.integer('address_id')
      .references('id').inTable('addresses');
    table.index('address_id', 'idx_employees_address_id');
  });

  console.log('✅ Added address_id column to employees table');

  // =============================================
  // Verification
  // =============================================
  
  const addressCount = await knex('addresses').count('* as count').first();
  const pawnersWithAddress = await knex('pawners').whereNotNull('address_id').count('* as count').first();
  const pawnersWithoutAddress = await knex('pawners').whereNull('address_id').count('* as count').first();
  
  console.log('\n==============================================');
  console.log('Migration completed successfully!');
  console.log('==============================================');
  console.log(`Created addresses: ${addressCount.count}`);
  console.log(`Pawners with address: ${pawnersWithAddress.count}`);
  console.log(`Pawners without address: ${pawnersWithoutAddress.count}`);
  console.log('\nNext steps:');
  console.log('1. Update API routes to use addresses table');
  console.log('2. Update frontend to use new structure');
  console.log('3. After verification, run rollback if needed or drop old columns');
  console.log('==============================================\n');
};

exports.down = async function(knex) {
  console.log('Rolling back addresses table migration...');
  
  // Remove address_id from employees
  await knex.schema.table('employees', (table) => {
    table.dropIndex('address_id', 'idx_employees_address_id');
    table.dropColumn('address_id');
  });
  console.log('✅ Removed address_id from employees');
  
  // Remove address_id from pawners
  await knex.schema.table('pawners', (table) => {
    table.dropIndex('address_id', 'idx_pawners_address_id');
    table.dropColumn('address_id');
  });
  console.log('✅ Removed address_id from pawners');
  
  // Drop addresses table
  await knex.schema.dropTableIfExists('addresses');
  console.log('✅ Dropped addresses table');
  
  console.log('\n==============================================');
  console.log('Rollback completed successfully!');
  console.log('==============================================\n');
};
