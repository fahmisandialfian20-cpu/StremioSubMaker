const fs = require('fs');
const raw = fs.readFileSync('locales/es.json', 'utf8');
const idx = raw.indexOf('selectOption');
console.log('Context RAW:\n', raw.slice(idx, idx+200));
const converted = Buffer.from(raw, 'latin1').toString('utf8');
const idx2 = converted.indexOf('selectOption');
console.log('\nContext CONVERTED:\n', converted.slice(idx2, idx2+200));
