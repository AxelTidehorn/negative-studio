import fs from 'node:fs';
await import('../src/conversion-v2/diagnostics.js');
const [a,b]=process.argv.slice(2);if(!a||!b)throw Error('Usage: node tools/compare-v2-diagnostics.mjs A.json B.json');
console.log(JSON.stringify(NSV2Diagnostics.compare(JSON.parse(fs.readFileSync(a)),JSON.parse(fs.readFileSync(b))),null,2));
