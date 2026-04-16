const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.ERRORS', 'utf8'));

console.log('Total errors:', data.length);
console.log('\nErrors by code:');

const byCode = {};
data.forEach(e => {
  if (!byCode[e.code]) byCode[e.code] = [];
  byCode[e.code].push(e);
});

Object.keys(byCode).sort((a, b) => byCode[b].length - byCode[a].length).forEach(code => {
  console.log(`\nCode ${code} (${byCode[code].length} errors):`);
  byCode[code].slice(0, 5).forEach(e => {
    console.log(`  Line ${e.startLineNumber}: ${e.message.substring(0, 100)}`);
  });
});
