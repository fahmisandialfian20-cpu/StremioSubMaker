const fs = require('fs');
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
const unchanged = [];
function walk(path, a, b) {
  if (typeof a === 'string') {
    if (typeof b === 'string' && a === b) unchanged.push(path);
    return;
  }
  if (!a || !b) return;
  for (const k of Object.keys(a)) {
    walk(path ? path + '.' + k : k, a[k], b[k]);
  }
}
walk('', en.messages, es.messages);
console.log('Same EN/ES count:', unchanged.length);
console.log(unchanged.slice(0, 200));
