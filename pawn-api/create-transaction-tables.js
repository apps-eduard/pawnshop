const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pawnshop_db',
  password: '123',
  port: 5432,
});

async function createTransactionTables() {
  try {
    console.log('🔄 Creating transaction and appraisal tables...');
    
    const sqlFile = path.join(__dirname, 'database', 'create-appraisals-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Transaction tables created successfully');
    console.log('✅ Audit trail system implemented');
    console.log('✅ Sample data inserted');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await pool.end();
  }
}

createTransactionTables();