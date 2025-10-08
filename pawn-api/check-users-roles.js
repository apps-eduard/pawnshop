const knex = require('knex')(require('./knexfile').development);

async function checkUsers() {
  try {
    const users = await knex('employees').select('id', 'username', 'role');
    
    console.log('📋 Available Users in Database:\n');
    users.forEach(user => {
      const hasAuctionAccess = ['administrator', 'manager', 'auctioneer'].includes(user.role);
      const icon = hasAuctionAccess ? '✅' : '❌';
      console.log(`${icon} ${user.id}. ${user.username.padEnd(20)} - Role: ${user.role}`);
    });
    
    console.log('\n💡 Users with ✅ can set auction prices');
    console.log('   Users with ❌ will get 403 Forbidden error');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
    process.exit(0);
  }
}

checkUsers();
