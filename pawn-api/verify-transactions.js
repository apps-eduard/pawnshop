const knex = require('knex')(require('./knexfile').development);

async function verifyTransactionsTable() {
  try {
    const result = await knex.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name IN ('granted_date', 'discount_amount', 'advance_interest', 'advance_service_charge', 'net_payment', 'new_principal_loan')
      ORDER BY column_name
    `);

    console.log('\n✅ Transactions Table - Special Columns:\n');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name.padEnd(30)} - ${row.data_type}`);
    });

    await knex.destroy();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifyTransactionsTable();
