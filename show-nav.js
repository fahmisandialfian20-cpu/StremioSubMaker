const fs = require('fs');
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
console.log(es.messages.nav);
