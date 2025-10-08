const knex = require('knex')(require('./knexfile').development);

async function checkTransactionStatus() {
  try {
    const transaction = await knex('transactions')
      .where('transaction_number', 'TXN-202510-000002')
      .first();
    
    console.log('\n=== Transaction TXN-202510-000002 Details ===');
    console.log('Status:', transaction.status);
    console.log('Expiry Date:', transaction.expiry_date);
    console.log('Maturity Date:', transaction.maturity_date);
    console.log('Granted Date:', transaction.granted_date);
    console.log('Transaction Date:', transaction.transaction_date);
    console.log('\n=== Date Comparison ===');
    const today = new Date();
    const expiryDate = new Date(transaction.expiry_date);
    console.log('Today:', today.toISOString().split('T')[0]);
    console.log('Expiry Date:', expiryDate.toISOString().split('T')[0]);
    console.log('Days Past Expiry:', Math.floor((today - expiryDate) / (1000 * 60 * 60 * 24)));
    console.log('Is Expired?', expiryDate < today);
    
    console.log('\n=== ISSUE FOUND ===');
    console.log('The transaction is expired (expiry date was May 8, 2025)');
    console.log('But the status in database is still:', transaction.status);
    console.log('\nThe system does NOT automatically update transaction status to "expired".');
    console.log('It only checks expiry_date < CURRENT_DATE when querying for expired items.');
    console.log('The status field remains "active" until the transaction is redeemed, renewed, or auctioned.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

checkTransactionStatus();
