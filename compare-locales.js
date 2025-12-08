const fs = require('fs');
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
function walk(prefix, a, b, missingA = [], missingB = []) {
  if (typeof a !== 'object' || !a || typeof b !== 'object' || !b) return;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  for (const k of ak) {
    if (!(k in b)) missingB.push(prefix ? prefix + '.' + k : k);
  }
  for (const k of bk) {
    if (!(k in a)) missingA.push(prefix ? prefix + '.' + k : k);
  }
  for (const k of ak) {
    if (k in b) walk(prefix ? prefix + '.' + k : k, a[k], b[k], missingA, missingB);
  }
  return { missingInEn: missingA, missingInEs: missingB };
}
const { missingInEn, missingInEs } = walk('', en.messages, es.messages);
console.log('Missing in ES:', missingInEs.length);
console.log(missingInEs);
console.log('Missing in EN:', missingInEn.length);
console.log(missingInEn);
