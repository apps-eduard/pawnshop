// This script fixes all interestRate conversions from decimal to percentage for display
const fs = require('fs');

const filePath = './routes/transactions.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of interestRate conversion
content = content.replace(
  /interestRate: parseFloat\(row\.interest_rate \|\| 0\),/g,
  'interestRate: parseFloat(row.interest_rate || 0) * 100, // Convert decimal to percentage for display'
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed all interestRate conversions for display');
console.log('Interest rates will now be displayed as percentages (10) instead of decimals (0.10)');