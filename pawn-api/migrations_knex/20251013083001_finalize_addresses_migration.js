/**
 * Migration: Finalize addresses table migration
 * Date: 2025-10-13
 * Description: Remove old address columns from pawners and employees tables
 *              after confirming data migration to addresses table
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('\n==============================================');
  console.log('Starting addresses table finalization...');
  console.log('==============================================\n');

  // =============================================
  // Step 1: Ensure all pawners have address_id
  // =============================================
  
  const pawnersWithoutAddress = await knex('pawners')
    .whereNull('address_id')
    .whereNotNull('city_id')
    .whereNotNull('barangay_id')
    .select('id', 'city_id', 'barangay_id', 'house_number', 'street');

  console.log(`Found ${pawnersWithoutAddress.length} pawners without address_id`);

  for (const pawner of pawnersWithoutAddress) {
    const addressDetails = [pawner.house_number, pawner.street]
      .filter(Boolean)
      .join(', ')
      .trim() || 'No address details';

    // Try to find existing address
    let address = await knex('addresses')
      .where({
        city_id: pawner.city_id,
        barangay_id: pawner.barangay_id,
        address_details: addressDetails
      })
      .first();

    // If not found, create new address
    if (!address) {
      const [newAddress] = await knex('addresses')
        .insert({
          city_id: pawner.city_id,
          barangay_id: pawner.barangay_id,
          address_details: addressDetails
        })
        .returning('*');
      address = newAddress;
      console.log(`  ✅ Created new address for pawner ${pawner.id}`);
    }

    // Update pawner with address_id
    await knex('pawners')
      .where('id', pawner.id)
      .update({ address_id: address.id });
    console.log(`  ✅ Updated pawner ${pawner.id} with address_id ${address.id}`);
  }

  // =============================================
  // Step 2: Migrate employee addresses (if any)
  // =============================================
  
  const employeesWithOldAddress = await knex('employees')
    .whereNull('address_id')
    .whereNotNull('address')
    .whereRaw("TRIM(address) != ''")
    .select('id', 'address');

  console.log(`\nFound ${employeesWithOldAddress.length} employees with old address field`);

  for (const employee of employeesWithOldAddress) {
    // Get default city and barangay (first available)
    const defaultCity = await knex('cities').first('id');
    const defaultBarangay = await knex('barangays').first('id');

    if (defaultCity && defaultBarangay) {
      const [newAddress] = await knex('addresses')
        .insert({
          city_id: defaultCity.id,
          barangay_id: defaultBarangay.id,
          address_details: employee.address,
          is_active: true
        })
        .returning('*');

      await knex('employees')
        .where('id', employee.id)
        .update({ address_id: newAddress.id });
      
      console.log(`  ✅ Migrated address for employee ${employee.id}`);
    }
  }

  // =============================================
  // Step 3: Drop old address columns from pawners
  // =============================================
  
  console.log('\nDropping old address columns from pawners table...');
  
  await knex.schema.table('pawners', (table) => {
    table.dropColumn('house_number');
    table.dropColumn('street');
    table.dropColumn('city_id');
    table.dropColumn('barangay_id');
    table.dropColumn('province');
    table.dropColumn('postal_code');
  });

  console.log('✅ Removed old address columns from pawners table');

  // =============================================
  // Step 4: Drop old address column from employees
  // =============================================
  
  console.log('\nDropping old address column from employees table...');
  
  await knex.schema.table('employees', (table) => {
    table.dropColumn('address');
  });

  console.log('✅ Removed old address column from employees table');

  // =============================================
  // Step 5: Verification
  // =============================================
  
  const totalPawners = await knex('pawners').count('* as count').first();
  const pawnersWithAddress = await knex('pawners').whereNotNull('address_id').count('* as count').first();
  const addressesCount = await knex('addresses').count('* as count').first();

  console.log('\n==============================================');
  console.log('Migration completed successfully!');
  console.log('==============================================');
  console.log(`Total pawners: ${totalPawners.count}`);
  console.log(`Pawners with address: ${pawnersWithAddress.count}`);
  console.log(`Total addresses: ${addressesCount.count}`);
  console.log('\nRemoved columns:');
  console.log('  From pawners: house_number, street, city_id, barangay_id, province, postal_code');
  console.log('  From employees: address');
  console.log('==============================================\n');
};

/**
 * Rollback migration - restore old columns
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('\n==============================================');
  console.log('Rolling back addresses finalization...');
  console.log('==============================================\n');

  // =============================================
  // Step 1: Restore pawner address columns
  // =============================================
  
  console.log('Restoring pawner address columns...');
  
  await knex.schema.table('pawners', (table) => {
    table.string('house_number', 20);
    table.string('street', 100);
    table.integer('city_id').references('id').inTable('cities');
    table.integer('barangay_id').references('id').inTable('barangays');
    table.string('province', 50);
    table.string('postal_code', 10);
  });

  console.log('✅ Restored pawner address columns');

  // =============================================
  // Step 2: Migrate data back to pawner columns
  // =============================================
  
  const pawners = await knex('pawners')
    .whereNotNull('address_id')
    .select('id', 'address_id');

  console.log(`\nMigrating data back for ${pawners.length} pawners...`);

  for (const pawner of pawners) {
    const address = await knex('addresses')
      .where('id', pawner.address_id)
      .first();

    if (address) {
      await knex('pawners')
        .where('id', pawner.id)
        .update({
          city_id: address.city_id,
          barangay_id: address.barangay_id,
          house_number: address.address_details
        });
    }
  }

  console.log('✅ Migrated pawner data back to old columns');

  // =============================================
  // Step 3: Restore employee address column
  // =============================================
  
  console.log('\nRestoring employee address column...');
  
  await knex.schema.table('employees', (table) => {
    table.text('address');
  });

  console.log('✅ Restored employee address column');

  // =============================================
  // Step 4: Migrate employee data back
  // =============================================
  
  const employees = await knex('employees')
    .whereNotNull('address_id')
    .select('id', 'address_id');

  console.log(`\nMigrating data back for ${employees.length} employees...`);

  for (const employee of employees) {
    const address = await knex('addresses')
      .where('id', employee.address_id)
      .first();

    if (address) {
      await knex('employees')
        .where('id', employee.id)
        .update({
          address: address.address_details
        });
    }
  }

  console.log('✅ Migrated employee data back to old column');

  console.log('\n==============================================');
  console.log('Rollback completed successfully!');
  console.log('==============================================\n');
};
