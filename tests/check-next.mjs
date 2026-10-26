import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.run('scheduleRender=()=>{};render=()=>{};');
for(const ext of ['NEF','cr2','CR3','rw2']){assert.equal(h.run(`NSFileFormats.isRaw('test.${ext}')`),true);assert.equal(h.run(`NSFileFormats.experimental('test.${ext}')`),true);}
assert.equal(h.run("NSFileFormats.supported('no.exe')"),false);
h.run(`globalThis.original={width:2,height:1,bits:16,colors:3,data:Uint16Array.from([50000,10000,1000,3000,4000,5000])};globalThis.wide=NSRawInput.convert(original,'wide');`);
assert.equal(h.run('wide.scale'),1);assert.equal(h.run('wide.colorSpace'),'rec2020');assert.equal(h.run('original.data[0]'),50000);assert.ok(Math.abs(h.run('wide.data[0]')-50000/65535)<1e-7);assert.equal(h.run("NSRawInput.options('wide').outputColor"),8);
console.log('PASS new RAW routing and float Rec.2020 preserves all three decoded channels');
h.run(`globalThis.ref={width:256,height:192,channels:3,scale:1,encoding:'linear',data:new Float32Array(256*192*3)};for(let y=0;y<192;y++)for(let x=0;x<256;x++){const gain=.6+.4*x/255;ref.data.set([.6*gain,.4*gain,.2*gain],(y*256+x)*3);}globalThis.flat=NSFlatField.build(ref,'camera','uniform.raw');globalThis.corrected={...ref,flatField:flat};`);
assert.equal(h.run('NSFlatField.valid(flat)'),true);assert.equal(h.run('NSFlatField.valid({...flat,gains:flat.gains.map(()=>NaN)})'),false);assert.equal(h.run("NSFlatField.valid({...flat,id:'forged'})"),false);
const a=h.run('NSColorEngine.pixel(corrected,12,96)'),b=h.run('NSColorEngine.pixel(corrected,244,96)');for(let k=0;k<3;k++)assert.ok(Math.abs(a[k]-b[k])<.005);assert.ok(Math.abs(a[0]/a[1]-1.5)<1e-6);
assert.notEqual(h.run("NSFlatField.signature(ref,'other')"),h.run("NSFlatField.signature(ref,'camera')"));
assert.throws(()=>h.run("NSFlatField.build({...ref,data:new Float32Array(ref.data.length).fill(1)},'camera')"),/klippta/);
console.log('PASS spatial reference removes a lighting gradient, preserves channel ratios and rejects invalid maps/references');
h.run(`working=corrected;workingPreview=CE.preview(working);state={...defaultState(),cropConfirmed:true};sourceInfo={encoding:'linear',label:'test'};cropRegion={x:0,y:0,w:1,h:1};analyzeLevels();globalThis.config=configuration38();globalThis.prepared=NSPixelKernel.prepare(working,config);globalThis.direct=NSPixelKernel.compile(config);`);
for(const [x,y] of [[0,0],[123,80],[255,191]]){const p=h.run(`prepared.pixel((${y}*working.width+${x})*3)`),q=h.run(`direct.pixel(CE.pixel(working,${x},${y}))`);for(let k=0;k<3;k++)assert.ok(Math.abs(p[k]-q[k])<1e-12);}
h.run(`globalThis.fine={width:3001,height:25,channels:3,scale:1,encoding:'linear',data:new Float32Array(3001*25*3)};for(let y=0;y<25;y++)for(let x=0;x<3001;x++)fine.data.fill(x%2?.8:.1,(y*3001+x)*3,(y*3001+x+1)*3);globalThis.detail=NSFlatField.region(fine,.6,.5,320);`);
assert.equal(h.run('detail.width'),320);assert.equal(h.run('detail.height'),25);assert.equal(h.run('detail.data[0]'),h.run('fine.data[detail.x0*3]'));assert.notEqual(h.run('detail.data[0]'),h.run('detail.data[3]'));assert.equal(h.run('detail.scale'),1);
console.log('PASS export uses spatially corrected source values and loupe preserves alternating original pixels beyond 1400px');
