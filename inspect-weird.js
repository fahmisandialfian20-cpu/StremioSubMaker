const fs = require('fs');
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
function get(path) {
  return path.split('.').reduce((o,k)=>o&&o[k], es.messages);
}
console.log('offsetHotkeys:', get('toolbox.sync.step3.offsetHotkeys'));
console.log('uploadTitle:', get('toolbox.sync.step2.uploadTitle'));
console.log('primaryManual:', get('toolbox.sync.step3.primary'));
