import fs from 'node:fs';import path from 'node:path';
const files={};
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.posix.join(dir,e.name);
  if(e.isDirectory())walk(p);else files[p]=fs.readFileSync(p).toString('base64');
 }
}
walk('tests');
const manifest=files['tests/fixtures/tiff/expected.json'];
if(!manifest)throw Error('TIFF fixtures must be generated before packing tests');
for(const fixture of JSON.parse(Buffer.from(manifest,'base64').toString('utf8'))){
 if(!files['tests/fixtures/tiff/'+fixture.name])throw Error('Missing TIFF fixture: '+fixture.name);
}
fs.writeFileSync('slider-regression-suite.json',JSON.stringify({format:'filmlabb-test-suite-v1',files}));
