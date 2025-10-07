/**
 * Penalty and Service Charge Configuration Seeds
 * Inserts default penalty and service charge settings
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get employee ID (assuming admin exists)
  const admin = await knex('employees').where('username', 'admin').first();
  const adminId = admin ? admin.id : 1;

  // ===== PENALTY CONFIGURATION =====
  const penaltyConfigs = [
    {
      config_key: 'monthly_penalty_rate',
      config_value: 0.02,
      description: 'Monthly penalty rate (2% = 0.02)',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'daily_penalty_threshold_days',
      config_value: 3,
      description: 'Days threshold for daily vs monthly penalty (less than 3 days = daily)',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'grace_period_days',
      config_value: 0,
      description: 'Grace period in days before penalty starts',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'penalty_compounding',
      config_value: 0,
      description: 'Whether penalty compounds (0 = no, 1 = yes)',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'max_penalty_multiplier',
      config_value: 12,
      description: 'Maximum penalty multiplier (e.g., 12 months worth)',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    }
  ];

  for (const config of penaltyConfigs) {
    await knex('penalty_config')
      .insert(config)
      .onConflict('config_key')
      .merge({
        config_value: config.config_value,
        description: config.description,
        updated_by: config.updated_by,
        updated_at: knex.fn.now()
      });
  }

  // ===== SERVICE CHARGE BRACKETS =====
  const serviceBrackets = [
    {
      bracket_name: 'Bracket 1-199',
      min_amount: 1,
      max_amount: 199,
      service_charge: 1,
      display_order: 1,
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      bracket_name: 'Bracket 200-299',
      min_amount: 200,
      max_amount: 299,
      service_charge: 2,
      display_order: 2,
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      bracket_name: 'Bracket 300-399',
      min_amount: 300,
      max_amount: 399,
      service_charge: 3,
      display_order: 3,
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      bracket_name: 'Bracket 400-499',
      min_amount: 400,
      max_amount: 499,
      service_charge: 4,
      display_order: 4,
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      bracket_name: 'Bracket 500+',
      min_amount: 500,
      max_amount: null,
      service_charge: 5,
      display_order: 5,
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    }
  ];

  for (const bracket of serviceBrackets) {
    await knex('service_charge_brackets')
      .insert(bracket)
      .onConflict(['min_amount', 'max_amount'])
      .merge({
        bracket_name: bracket.bracket_name,
        service_charge: bracket.service_charge,
        display_order: bracket.display_order,
        updated_by: bracket.updated_by,
        updated_at: knex.fn.now()
      });
  }

  // ===== SERVICE CHARGE CONFIGURATION =====
  const serviceConfigs = [
    {
      config_key: 'calculation_method',
      config_value: 1,
      description: 'Service charge calculation method (1=bracket-based, 2=percentage, 3=fixed)',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'percentage_rate',
      config_value: 0.01,
      description: 'Percentage rate for percentage-based calculation (1% = 0.01)',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'fixed_amount',
      config_value: 50,
      description: 'Fixed service charge amount',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'minimum_service_charge',
      config_value: 1,
      description: 'Minimum service charge amount',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    },
    {
      config_key: 'maximum_service_charge',
      config_value: 1000,
      description: 'Maximum service charge amount',
      is_active: true,
      created_by: adminId,
      updated_by: adminId
    }
  ];

  for (const config of serviceConfigs) {
    await knex('service_charge_config')
      .insert(config)
      .onConflict('config_key')
      .merge({
        config_value: config.config_value,
        description: config.description,
        updated_by: config.updated_by,
        updated_at: knex.fn.now()
      });
  }

  console.log('✅ Penalty and service charge configurations seeded successfully!');
  console.log('   - 5 penalty config settings');
  console.log('   - 5 service charge brackets (₱1-199, ₱200-299, ₱300-399, ₱400-499, ₱500+)');
  console.log('   - 5 service charge config settings');
};

