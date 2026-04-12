import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');
let newContent = content.replace(/rounded-\[3rem\]/g, 'rounded-3xl');
newContent = newContent.replace(/rounded-\[2\.5rem\]/g, 'rounded-2xl');
newContent = newContent.replace(/rounded-\[2rem\]/g, 'rounded-xl');
fs.writeFileSync('src/App.tsx', newContent);
console.log('Replaced rounded classes');
