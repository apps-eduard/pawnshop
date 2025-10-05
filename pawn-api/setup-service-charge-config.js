const { pool } = require('./config/database');

async function setupServiceChargeConfig() {
  try {
    console.log('🚀 Setting up dynamic service charge configuration system...\n');
    
    // Create service charge brackets table
    console.log('📋 Creating service_charge_brackets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_charge_brackets (
          id SERIAL PRIMARY KEY,
          bracket_name VARCHAR(100) NOT NULL,
          min_amount NUMERIC NOT NULL,
          max_amount NUMERIC,  -- NULL means no upper limit
          service_charge NUMERIC NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          display_order INTEGER DEFAULT 0,
          effective_date DATE DEFAULT CURRENT_DATE,
          created_by INTEGER REFERENCES employees(id),
          updated_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_bracket_range UNIQUE (min_amount, max_amount)
      )
    `);
    console.log('✅ service_charge_brackets table created');
    
    // Create service charge configuration table
    console.log('📋 Creating service_charge_config table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_charge_config (
          id SERIAL PRIMARY KEY,
          config_key VARCHAR(100) UNIQUE NOT NULL,
          config_value NUMERIC NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          effective_date DATE DEFAULT CURRENT_DATE,
          created_by INTEGER REFERENCES employees(id),
          updated_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ service_charge_config table created');
    
    // Create service charge calculation log table
    console.log('📋 Creating service_charge_calculation_log table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_charge_calculation_log (
          id SERIAL PRIMARY KEY,
          transaction_id INTEGER REFERENCES transactions(id),
          calculation_date DATE NOT NULL,
          principal_amount NUMERIC NOT NULL,
          service_charge_amount NUMERIC NOT NULL,
          calculation_method VARCHAR(50) NOT NULL,
          bracket_used VARCHAR(100),
          config_snapshot JSONB,
          calculated_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ service_charge_calculation_log table created');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_charge_brackets_range ON service_charge_brackets(min_amount, max_amount) WHERE is_active = TRUE`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_charge_config_key ON service_charge_config(config_key) WHERE is_active = TRUE`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_charge_log_transaction ON service_charge_calculation_log(transaction_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_charge_log_date ON service_charge_calculation_log(calculation_date)`);
    console.log('✅ Indexes created');
    
    // Insert default service charge brackets
    console.log('⚙️ Inserting default service charge brackets...');
    await pool.query(`
      INSERT INTO service_charge_brackets (bracket_name, min_amount, max_amount, service_charge, display_order, created_by, updated_by) VALUES
      ('Bracket 1-100', 1, 100, 1, 1, 1, 1),
      ('Bracket 101-200', 101, 200, 2, 2, 1, 1),
      ('Bracket 201-300', 201, 300, 3, 3, 1, 1),
      ('Bracket 301-400', 301, 400, 4, 4, 1, 1),
      ('Bracket 500+', 500, NULL, 5, 5, 1, 1)
      ON CONFLICT (min_amount, max_amount) DO UPDATE SET
          service_charge = EXCLUDED.service_charge,
          bracket_name = EXCLUDED.bracket_name,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✅ Default service charge brackets inserted');
    
    // Insert default service charge configuration
    console.log('⚙️ Inserting default service charge configuration...');
    await pool.query(`
      INSERT INTO service_charge_config (config_key, config_value, description, created_by, updated_by) VALUES
      ('calculation_method', 1, 'Service charge calculation method (1=bracket-based, 2=percentage, 3=fixed)', 1, 1),
      ('percentage_rate', 0.01, 'Percentage rate for percentage-based calculation (1% = 0.01)', 1, 1),
      ('fixed_amount', 50, 'Fixed service charge amount', 1, 1),
      ('minimum_service_charge', 1, 'Minimum service charge amount', 1, 1),
      ('maximum_service_charge', 1000, 'Maximum service charge amount', 1, 1)
      ON CONFLICT (config_key) DO UPDATE SET
          config_value = EXCLUDED.config_value,
          description = EXCLUDED.description,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✅ Default service charge configuration inserted');
    
    // Verify configuration
    console.log('\n🔍 Verifying service charge configuration...');
    const bracketsResult = await pool.query('SELECT * FROM service_charge_brackets ORDER BY display_order');
    const configResult = await pool.query('SELECT * FROM service_charge_config ORDER BY config_key');
    
    console.log('📊 Current service charge brackets:');
    bracketsResult.rows.forEach(bracket => {
      const maxDisplay = bracket.max_amount ? `${bracket.max_amount}` : '∞';
      console.log(`  ├─ ${bracket.bracket_name}: ₱${bracket.min_amount} - ₱${maxDisplay} → ₱${bracket.service_charge}`);
    });
    
    console.log('\n📊 Current service charge configuration:');
    configResult.rows.forEach(config => {
      console.log(`  ├─ ${config.config_key}: ${config.config_value} - ${config.description}`);
    });
    
    console.log('\n✅ Dynamic service charge configuration system setup completed!');
    console.log('\n📝 Usage Notes:');
    console.log('  • Service charge brackets can be changed through the API without code changes');
    console.log('  • Configuration is cached for 5 minutes for performance');
    console.log('  • All service charge calculations are logged for audit trail');
    console.log('  • Use /api/service-charge-config endpoints to manage settings');
    
    console.log('\n🧮 Current service charge calculation logic:');
    console.log('  • ₱1-100: ₱1 service charge');
    console.log('  • ₱101-200: ₱2 service charge');
    console.log('  • ₱201-300: ₱3 service charge');
    console.log('  • ₱301-400: ₱4 service charge');
    console.log('  • ₱500+: ₱5 service charge');
    
  } catch (error) {
    console.error('❌ Error setting up service charge configuration:', error);
    throw error;
  } finally {
    process.exit();
  }
}

setupServiceChargeConfig();