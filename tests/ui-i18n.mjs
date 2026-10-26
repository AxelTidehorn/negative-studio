import assert from 'node:assert/strict';
import '../src/ui/i18n-messages.js';
const api=FILMLABB_I18N;
for(const row of api.catalogue){assert.equal(row.length,5);for(const text of row){assert.equal(typeof text,'string');assert.ok(text.trim());assert.deepEqual([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...row[0].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),row[0]);}}
for(const lang of api.languages){api.setLocale(lang);const expected=api.t('frame.loading',{name:'Åsa [test]+.RAF'});assert.equal(api.fromSource('Laddar Åsa [test]+.RAF…'),expected);assert.ok(expected.includes('Åsa [test]+.RAF'));assert.equal(api.fromSource('Importfel: Ingen bild avkodades.'),api.t('Importfel: {error}',{error:'Ingen bild avkodades.'}));const queue=api.t('queue.status',{count:2,index:1,profile:'Generisk C-41'});assert.ok(queue.includes(api.fromSource('Generisk C-41')));assert.ok(!queue.includes('{'));assert.equal(api.fromSource('  Bekräfta  '),'  '+api.t('Bekräfta')+'  ');}
api.setLocale('xx');assert.equal(api.get(),'en');
console.log('PASS five complete catalogues, template parameters, nested errors, punctuation, opaque filenames, whitespace and locale fallback');
