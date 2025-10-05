const { pool } = require('./config/database');

async function setupPenaltyConfig() {
  try {
    console.log('🚀 Setting up dynamic penalty configuration system...\n');
    
    // Create penalty configuration table
    console.log('📋 Creating penalty_config table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS penalty_config (
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
    console.log('✅ penalty_config table created');
    
    // Create penalty calculation log table
    console.log('📋 Creating penalty_calculation_log table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS penalty_calculation_log (
          id SERIAL PRIMARY KEY,
          transaction_id INTEGER REFERENCES transactions(id),
          calculation_date DATE NOT NULL,
          principal_amount NUMERIC NOT NULL,
          days_overdue INTEGER NOT NULL,
          penalty_rate NUMERIC NOT NULL,
          penalty_amount NUMERIC NOT NULL,
          calculation_method VARCHAR(50) NOT NULL,
          config_snapshot JSONB,
          calculated_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ penalty_calculation_log table created');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_penalty_config_key ON penalty_config(config_key) WHERE is_active = TRUE`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_penalty_log_transaction ON penalty_calculation_log(transaction_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_penalty_log_date ON penalty_calculation_log(calculation_date)`);
    console.log('✅ Indexes created');
    
    // Insert default configuration
    console.log('⚙️ Inserting default penalty configuration...');
    await pool.query(`
      INSERT INTO penalty_config (config_key, config_value, description, created_by, updated_by) VALUES
      ('monthly_penalty_rate', 0.02, 'Monthly penalty rate (2% = 0.02)', 1, 1),
      ('daily_penalty_threshold_days', 3, 'Days threshold for daily vs monthly penalty (less than 3 days = daily)', 1, 1),
      ('grace_period_days', 0, 'Grace period in days before penalty starts', 1, 1),
      ('penalty_compounding', 0, 'Whether penalty compounds (0 = no, 1 = yes)', 1, 1),
      ('max_penalty_multiplier', 12, 'Maximum penalty multiplier (e.g., 12 months worth)', 1, 1)
      ON CONFLICT (config_key) DO UPDATE SET
          config_value = EXCLUDED.config_value,
          description = EXCLUDED.description,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
    `);
    console.log('✅ Default configuration inserted');
    
    // Verify configuration
    console.log('\n🔍 Verifying penalty configuration...');
    const configResult = await pool.query('SELECT * FROM penalty_config ORDER BY config_key');
    
    console.log('📊 Current penalty configuration:');
    configResult.rows.forEach(config => {
      console.log(`  ├─ ${config.config_key}: ${config.config_value} - ${config.description}`);
    });
    
    console.log('\n✅ Dynamic penalty configuration system setup completed!');
    console.log('\n📝 Usage Notes:');
    console.log('  • Penalty rates can be changed through the API without code changes');
    console.log('  • Configuration is cached for 5 minutes for performance');
    console.log('  • All penalty calculations are logged for audit trail');
    console.log('  • Use /api/penalty-config endpoints to manage settings');
    
    console.log('\n🧮 Current penalty calculation logic:');
    console.log('  • Less than 3 days overdue: Daily penalty = (principal × 0.02 ÷ 30) × days');
    console.log('  • 3+ days overdue: Monthly penalty = principal × 0.02');
    console.log('  • Grace period: 0 days (configurable)');
    console.log('  • Maximum penalty: 12 months worth (configurable)');
    
  } catch (error) {
    console.error('❌ Error setting up penalty configuration:', error);
    throw error;
  } finally {
    process.exit();
  }
}

setupPenaltyConfig();