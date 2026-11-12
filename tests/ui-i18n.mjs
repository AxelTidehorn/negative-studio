import assert from 'node:assert/strict';
import '../src/ui/i18n-messages.js';
const api=FILMLABB_I18N;
for(const row of api.catalogue){assert.equal(row.length,5);for(const text of row){assert.equal(typeof text,'string');assert.ok(text.trim());assert.deepEqual([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...row[0].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),row[0]);}}
for(const lang of api.languages){api.setLocale(lang);const expected=api.t('frame.loading',{name:'Åsa [test]+.RAF'});assert.equal(api.fromSource('Laddar Åsa [test]+.RAF…'),expected);assert.ok(expected.includes('Åsa [test]+.RAF'));assert.equal(api.fromSource('Importfel: Ingen bild avkodades.'),api.t('Importfel: {error}',{error:'Ingen bild avkodades.'}));const queue=api.t('queue.status',{count:2,index:1,profile:'Generisk C-41'});assert.ok(queue.includes(api.fromSource('Generisk C-41')));assert.ok(!queue.includes('{'));assert.equal(api.fromSource('  Bekräfta  '),'  '+api.t('Bekräfta')+'  ');}
const loading=['Laddar Åsa.RAF…','Loading Åsa.RAF…','Chargement de Åsa.RAF…','Cargando Åsa.RAF…','Åsa.RAF wird geladen…'];
api.languages.forEach((lang,i)=>assert.equal(api.fromSource('Laddar Åsa.RAF…',lang),loading[i]));
for(const lang of api.languages){const error=api.fromSource('TIFF-komprimering 7 stöds inte (välj LZW, ZIP eller okomprimerad)',lang);assert.equal(error,api.t('TIFF-komprimering {count} stöds inte (välj LZW, ZIP eller okomprimerad)',{count:7},lang));}
api.setLocale('xx');assert.equal(api.get(),'en');
console.log('PASS five complete catalogues, template parameters, nested errors, punctuation, opaque filenames, whitespace and locale fallback');

import {readSource} from './helpers/source.mjs';
import {assets} from '../app-manifest.mjs';

const html=readSource('index.html','utf8'),locale=readSource('i18n-messages.js','utf8'),sw=readSource('sw.js','utf8');
for(const v of ['sv','en','fr','es','de'])assert.match(locale,new RegExp("'"+v+"'"));
assert.match(html,/id="languageSelect"/);
assert.match(html,/<button\b(?=[^>]*\bid="supportLink")(?=[^>]*\bdisabled)[^>]*>/);
assert.match(html,/<footer class="foot"><div class="footer-links">/);
assert.doesNotMatch(html,/<span class="version" title="Bilderna stannar/);
assert.match(sw,/cache-worker\.js/);assert.ok(assets['i18n.js']);assert.match(readSource('cache-worker.js','utf8'),/const ASSETS=\[\];/);
console.log('PASS i18n scaffolding, header/footer and current cache entry point');
