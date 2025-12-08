const fs = require('fs');
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
function printSection(path) {
  const parts = path.split('.');
  let a = en.messages, b = es.messages;
  for (const p of parts) { a = a[p]; b = b[p]; }
  console.log('===', path, '===');
  if (typeof a === 'string') {
    console.log('EN:', a);
    console.log('ES:', b);
  } else {
    for (const k of Object.keys(a)) {
      console.log('-', k);
      if (typeof a[k] === 'string') {
        console.log('  EN:', a[k]);
        console.log('  ES:', b[k]);
      }
    }
  }
}
['common','manifest','api.fileUpload','server.errors','server.selector','apiErrors','toolbox.hero','toolbox.tools.translate','toolbox.sync.step3.primaryOptions','toolbox.sync.step3.primary','toolbox.sync.step3.presets.alass','toolbox.sync.step3.presets.ffsubsync','toolbox.sync.step3.presets.vosk','toolbox.sync.step3.presets.whisper'].forEach(printSection);
