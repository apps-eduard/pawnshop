const bcrypt = require('bcrypt');

async function generatePasswordHashes() {
  try {
    const password = 'password'; // Default password
    const saltRounds = 10;
    
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('🔐 Generated password hashes for default users:');
    console.log(`Password: "${password}"`);
    console.log(`Hash: "${hash}"`);
    console.log('');
    console.log('📋 Default users will be:');
    console.log('• admin / password');
    console.log('• cashier1 / password');  
    console.log('• manager1 / password');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords in production!');
    
    return hash;
  } catch (error) {
    console.error('Error generating password hash:', error);
    throw error;
  }
}

generatePasswordHashes();