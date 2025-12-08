const fs = require('fs');
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
function get(path) { return path.split('.').reduce((o,k)=>o&&o[k], es.messages); }
console.log('sync.step3.offsetHotkeys:', get('sync.step3.offsetHotkeys'));
console.log('sync.step3.primary.manual:', get('sync.step3.primary.manual'));
console.log('sync.step3.primary.alass:', get('sync.step3.primary.alass'));
