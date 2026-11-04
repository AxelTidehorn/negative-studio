import {readSource} from './helpers/source.mjs';
import {assets} from '../app-manifest.mjs';
import assert from 'node:assert/strict';
const html=readSource('index.html','utf8'),locale=readSource('i18n-messages.js','utf8'),sw=readSource('sw.js','utf8');
for(const v of ['sv','en','fr','es','de'])assert.match(locale,new RegExp("'"+v+"'"));
assert.match(html,/id="languageSelect"/);
assert.match(html,/<button\b(?=[^>]*\bid="supportLink")(?=[^>]*\bdisabled)[^>]*>/);
assert.match(html,/<footer class="foot"><div class="footer-links">/);
assert.doesNotMatch(html,/<span class="version" title="Bilderna stannar/);
// Icon-only zoom buttons and the preview canvas need accessible names that the catalogue translates.
for(const [id,name] of [['zoomOut','Zooma ut'],['zoomIn','Zooma in'],['preview','Bildförhandsvisning']]){assert.match(html,new RegExp('<(?:button|canvas)\\b(?=[^>]*\\bid="'+id+'")(?=[^>]*\\baria-label="'+name+'")[^>]*>'),id);assert.ok(locale.includes('["'+name+'",'),name);}
assert.match(sw,/cache-worker\.js/);assert.ok(assets['i18n.js']);assert.match(readSource('cache-worker.js','utf8'),/const ASSETS=\[\];/);
console.log('PASS i18n scaffolding, header/footer and current cache entry point');
