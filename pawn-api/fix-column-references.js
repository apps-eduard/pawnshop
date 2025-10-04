// Fix all remaining contact_number and address_details references
const fs = require('fs');

const filePath = './routes/transactions.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fixing remaining column reference issues...');

// Fix remaining contact_number references
content = content.replace(/row\.contact_number/g, 'row.mobile_number');
console.log('✅ Fixed contact_number → mobile_number');

// Fix address_details references
content = content.replace(/row\.address_details/g, '`${row.house_number || \'\'} ${row.street || \'\'}`.trim()');
console.log('✅ Fixed address_details → house_number + street');

// Also need to fix the query that still has p.contact_number
content = content.replace(
  'p.first_name, p.last_name, p.contact_number, p.email,',
  'p.first_name, p.last_name, p.mobile_number, p.email,'
);
console.log('✅ Fixed query with contact_number');

fs.writeFileSync(filePath, content);
console.log('🎉 All column reference issues fixed!');