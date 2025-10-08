// Check which user is logged in and their role
console.log('🔍 Checking logged in user role...\n');

const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

if (!token) {
  console.log('❌ No token found in localStorage');
  console.log('You need to log in first!');
} else {
  console.log('✅ Token found:', token.substring(0, 50) + '...');
}

if (user) {
  const userObj = JSON.parse(user);
  console.log('👤 Current User:', userObj);
  console.log('   - Username:', userObj.username);
  console.log('   - Role:', userObj.role);
  console.log('   - ID:', userObj.id);
  
  console.log('\n📋 Required roles for set-auction-price:');
  console.log('   - administrator');
  console.log('   - manager');
  console.log('   - auctioneer');
  
  const hasAccess = ['administrator', 'manager', 'auctioneer'].includes(userObj.role);
  
  if (hasAccess) {
    console.log('\n✅ Your role has access!');
  } else {
    console.log('\n❌ Your role does NOT have access!');
    console.log('   Current role:', userObj.role);
    console.log('   You need to log in as an administrator, manager, or auctioneer.');
  }
} else {
  console.log('❌ No user found in localStorage');
}
