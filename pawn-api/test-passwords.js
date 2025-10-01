const bcrypt = require('bcrypt');

async function testPasswords() {
    console.log('Testing common passwords...');
    const testPasswords = ['admin123', 'password123', 'admin', '123456'];
    const adminHash = '$2b$10$.ASaAVGrZmHhzGaKjNwmsuUi2NjThUt4Mkf1C2H.zz33cWEseF2cK';
    
    for (const pwd of testPasswords) {
        const result = await bcrypt.compare(pwd, adminHash);
        if (result) {
            console.log(`✅ Admin password is: ${pwd}`);
            break;
        } else {
            console.log(`❌ ${pwd} is not correct`);
        }
    }
}

testPasswords();