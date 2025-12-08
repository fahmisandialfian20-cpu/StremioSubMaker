const fs = require('fs');
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
function section(path) {
  const parts = path.split('.');
  let a = en.messages, b = es.messages;
  for (const p of parts) { a = a[p]; b = b[p]; }
  console.log('\n===', path, '===');
  if (typeof a === 'string') {
    console.log('EN:', a); console.log('ES:', b);
  } else {
    for (const k of Object.keys(a)) {
      if (typeof a[k] === 'string') {
        console.log('-', k); console.log('  EN:', a[k]); console.log('  ES:', b[k]);
      }
    }
  }
}
['nav','config.hero','config.quickStats','config.opensubs','config.learnMode','fileUpload.hero','fileUpload.advanced','fileUpload.queue','sync.hero','sync.step1','sync.step2','sync.step3','sync.plan'].forEach(section);
