const fs = require('fs');
const path = require('path');

// Path to the file with errors
const filePath = path.resolve(__dirname, 'pawn-web/src/app/pages/cashier-dashboard/cashier-dashboard.ts');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Fix import line error
content = content.replace(
  /import { CategoriesService, Category } from '\.\.\/\.\.\/core\/serv    \/\/ Initialize financial values/,
  "import { CategoriesService, Category } from '../../core/services/categories.service';"
);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed import statement in cashier-dashboard.ts');