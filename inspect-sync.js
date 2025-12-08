const fs = require('fs');
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
console.log(Object.keys(es.messages.toolbox));
console.log('sync keys:', Object.keys(es.messages.toolbox.sync));
console.log('sync.step3 keys:', Object.keys(es.messages.toolbox.sync.step3));
console.log('sync.step3 sample:', es.messages.toolbox.sync.step3);
