import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8'),locale=fs.readFileSync('i18n.js','utf8'),sw=fs.readFileSync('sw.js','utf8'),site=fs.readFileSync('site/index.html','utf8');
for(const v of ['sv','en','fr','es','de'])assert.match(locale,new RegExp("'"+v+"'"));
assert.match(html,/id="languageSelect"/);
assert.match(html,/id="supportLink"[^>]*disabled/);
assert.match(html,/<div class="foot"><div class="footer-links">/);
assert.doesNotMatch(html,/<span class="version" title="Bilderna stannar/);
assert.match(sw,/i18n\.js/);assert.equal(site,html);
console.log('PASS Beta 3.7 i18n scaffolding, header/footer and site parity');
