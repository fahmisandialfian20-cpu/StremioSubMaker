const fs = require('fs');
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
function show(path) {
  const get = (obj,p)=>p.split('.').reduce((o,k)=>o&&o[k], obj);
  console.log('\n===', path, '===');
  console.log('EN:', get(en.messages, path));
  console.log('ES:', get(es.messages, path));
}
['toolbox.tools.sync.body','toolbox.tools.sync.cta','sync.step3.primaryOptions.ffsubsync','sync.step3.primary.ffsubsync'].forEach(show);
