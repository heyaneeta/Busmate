const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const newContent = content.replace(/bubbly-text/g, 'tracking-tight');
fs.writeFileSync('src/App.tsx', newContent);
console.log('Replaced all bubbly-text with tracking-tight');
