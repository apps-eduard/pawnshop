const { pool } = require('./config/database');

async function runManualMigration() {
  try {
    console.log('🔄 Starting manual admin settings migration...');
    
    // Add columns one by one
    console.log('📝 Adding code column...');
    await pool.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(20)');
    
    console.log('📝 Adding phone column...');
    await pool.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone VARCHAR(20)');
    
    console.log('📝 Adding email column...');
    await pool.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS email VARCHAR(100)');
    
    console.log('📝 Adding manager_name column...');
    await pool.query('ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100)');
    
    console.log('📝 Setting phone values...');
    await pool.query('UPDATE branches SET phone = contact_number WHERE phone IS NULL AND contact_number IS NOT NULL');
    
    console.log('📝 Setting default codes...');
    await pool.query("UPDATE branches SET code = 'MAIN' WHERE code IS NULL AND name ILIKE '%main%'");
    await pool.query("UPDATE branches SET code = 'BR' || id WHERE code IS NULL");
    
    console.log('📝 Adding unique constraint to code...');
    try {
      await pool.query('ALTER TABLE branches ADD CONSTRAINT branches_code_unique UNIQUE (code)');
    } catch (e) {
      console.log('⚠️ Unique constraint already exists or other issue:', e.message);
    }
    
    console.log('📝 Inserting/updating categories...');
    await pool.query(`
      INSERT INTO categories (name, description, interest_rate) VALUES
          ('Jewelry', 'Gold, silver, and precious metal items', 3.00),
          ('Appliance', 'Electronic appliances and gadgets', 6.00)
      ON CONFLICT (name) DO UPDATE SET 
          interest_rate = EXCLUDED.interest_rate,
          description = EXCLUDED.description
    `);
    
    console.log('📝 Inserting voucher types...');
    await pool.query(`
      INSERT INTO voucher_types (code, type, description) VALUES
          ('CASH', 'cash', 'Cash payment voucher'),
          ('CHEQUE', 'cheque', 'Cheque payment voucher')
      ON CONFLICT (code) DO NOTHING
    `);
    
    console.log('📝 Inserting loan rules...');
    await pool.query(`
      INSERT INTO loan_rules (service_charge_rate, minimum_service_charge, minimum_loan_for_service) VALUES
          (0.0100, 5.00, 500.00)
    `);
    
    console.log('📝 Updating branch info...');
    await pool.query(`
      UPDATE branches SET 
          manager_name = COALESCE(manager_name, 'Juan Dela Cruz'),
          phone = COALESCE(phone, contact_number, '+63-2-123-4567'),
          email = COALESCE(email, 'main@goldwin.ph'),
          address = COALESCE(address, '123 Main Street, Manila, Philippines')
      WHERE id = (SELECT MIN(id) FROM branches)
    `);
    
    console.log('✅ Manual migration completed successfully!');
    
    // Verify data
    const categoriesResult = await pool.query('SELECT name, interest_rate FROM categories ORDER BY name');
    console.log('📂 Categories:', categoriesResult.rows);
    
    const branchesResult = await pool.query('SELECT name, code, phone, email, manager_name FROM branches LIMIT 3');
    console.log('🏢 Branches:', branchesResult.rows);
    
    const voucherResult = await pool.query('SELECT code, type FROM voucher_types ORDER BY code');
    console.log('🧾 Voucher Types:', voucherResult.rows);
    
    const loanRulesResult = await pool.query('SELECT * FROM loan_rules ORDER BY id DESC LIMIT 1');
    console.log('⚙️ Loan Rules:', loanRulesResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runManualMigration();