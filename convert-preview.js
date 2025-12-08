const fs = require('fs');
const raw = fs.readFileSync('locales/es.json', 'utf8');
const converted = Buffer.from(raw, 'latin1').toString('utf8');
console.log('RAW:\n', raw.slice(0, 400));
console.log('-----');
console.log('CONVERTED:\n', converted.slice(0, 400));
