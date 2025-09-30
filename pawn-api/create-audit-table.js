const { pool } = require('./config/database');

async function createAuditTable() {
  try {
    console.log('🔄 Creating audit trail table...');
    
    // Create the audit table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          action VARCHAR(50) NOT NULL,
          table_name VARCHAR(50) NOT NULL,
          record_id INTEGER,
          old_values JSONB,
          new_values JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Audit table created');
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON admin_audit_log(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON admin_audit_log(table_name)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at)');
    
    console.log('✅ Indexes created');
    
    // Insert sample data
    await pool.query(`
      INSERT INTO admin_audit_log (user_id, action, table_name, record_id, new_values) VALUES
          (1, 'CREATE', 'categories', 1, '{"name": "Jewelry", "interest_rate": 3.00}'),
          (1, 'CREATE', 'categories', 2, '{"name": "Appliance", "interest_rate": 6.00}'),
          (1, 'UPDATE', 'loan_rules', 1, '{"service_charge_rate": 0.01, "minimum_service_charge": 5.00}')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Sample audit data inserted');
    
    // Verify 
    const result = await pool.query('SELECT COUNT(*) as count FROM admin_audit_log');
    console.log('📊 Total audit entries:', result.rows[0].count);
    
    const recent = await pool.query('SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 3');
    console.log('📋 Recent entries:', recent.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAuditTable();