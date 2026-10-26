import {readSource,sourcePath} from './helpers/source.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import {harness} from './helpers/app-harness.mjs';
const h=harness();let n=0;async function test(name,fn){await fn();console.log('PASS',name);n++;}
h.run(`src=new ImageData(60,40);for(let y=0;y<40;y++)for(let x=0;x<60;x++){const i=(y*60+x)*4;src.data.set([80+x*2,60+x,20+y,255],i);}state.engine='beta2';roll=[{file:{name:'test.jpg'},settings:{...state},crop:{x:.1,y:.1,w:.8,h:.8},selected:true},{file:{name:'second.jpg'},settings:defaultState(),crop:{x:.2,y:.2,w:.6,h:.6},selected:true}];activeFrame=0;cropRegion=roll[0].crop;state.cropConfirmed=true;finishImport('test');`);
await test('Application initializes all scripts without runtime errors',()=>assert.ok(h.run('workingPreview.data.length>0')));
await test('New default uses log-channel conversion after comparison',()=>assert.equal(h.run('defaultState().engine'),'calibrated4'));
await test('Fast Beta 1 inversion matches the former density expression',()=>{
 const error=h.run(`(()=>{let worst=0;for(let v=1;v<=65535;v+=1279)for(let b=1;b<=255;b+=11){const t=Math.max(1/65535,Math.min(1,v/65535)),fb=Math.max(1/65535,b/255),d=Math.max(0,-Math.log10(Math.max(1/65535,t/fb))),previous=1-Math.exp(-2.302585093*d),next=untoned([v,v,v],[b,b,b],{noBase:false},65535)[0];worst=Math.max(worst,Math.abs(previous-next));}return worst;})()`);
 assert.ok(error<1e-9,`conversion changed by ${error}`);
});
await test('Neutral RAW export lookup matches direct color development',()=>{
 const error=h.run(`(()=>{rollShared.profile='generic';rollShared.print='neutral';state={...state,engine:'beta3',saturation:1,exposure:.25,contrast:1.12,gamma:.9};const im={width:1,height:1,channels:3,data:new Uint16Array(3),scale:65535,encoding:'linear'},table=neutralLookup(state,im);let worst=0;for(const pixel of [[1200,18000,33333],[30000,42000,61000],[65535,10,27000]]){const direct=technicalPositive(pixel.map(v=>v/65535),state);for(let c=0;c<3;c++)worst=Math.max(worst,Math.abs(Math.round(direct[c]*65535)-table[c][pixel[c]]));}return worst;})()`);
 assert.ok(error<=1,`lookup differs by ${error} 16-bit levels`);
});
await test('Wide gamut TIFF keeps red variation before 16-bit quantization',()=>{
 const icc=readSource('tests/fixtures/adobe-rgb.icc');h.set('globalThis.testICC',icc);
 const sample=h.run(`(()=>{const data=new Uint16Array(100*3);for(let j=0;j<100;j++){data[j*3]=Math.round((.88+j*.001)*65535);data[j*3+1]=26214;data[j*3+2]=13107;}const raw=prepareTiff({width:10,height:10,channels:3,bits:16,data,icc:testICC});return {a:raw.data[0],b:raw.data[99*3],clipped:Array.from({length:100},(_,j)=>raw.data[j*3]).filter(v=>v===65535).length,label:sourceInfo.label};})()`);
 assert.ok(sample.a<sample.b,'red values beyond sRGB gamut must remain distinct');assert.ok(sample.clipped<3);assert.match(sample.label,/gemensam skala/);
});
await test('Beta 3 fallback base samples only the film frame',()=>{
 h.run(`sourceInfo={encoding:'srgb',label:'JPEG'};state.engine='beta3';const r={x:.1,y:.1,w:.8,h:.8};cropRegion=r;for(let y=0;y<40;y++)for(let x=0;x<60;x++)if(x<6||x>=54||y<4||y>=36){const i=(y*60+x)*4;src.data.set([255,255,255,255],i);}finishImport('test');`);
 const before=h.run('JSON.stringify(beta3Base)');h.run(`for(let y=0;y<40;y++)for(let x=0;x<60;x++)if(x<6||x>=54||y<4||y>=36){const i=(y*60+x)*4;src.data.set([0,0,0,255],i);}finishImport('test');`);
 assert.equal(h.run('JSON.stringify(beta3Base)'),before);
});
await test('Creative profiles do not change technical calibration',()=>{const before=h.run('JSON.stringify(calibration)');for(const p of ['gold','portra','fuji400']){h.run(`rollShared.profile='${p}';rollShared.strength=.9;render();`);assert.equal(h.run('JSON.stringify(calibration)'),before);}});
await test('Profile strength 0 is identical across all color profiles',()=>{h.run('rollShared.strength=0;');const q=h.run(`rollShared.profile='generic';JSON.stringify(technicalPositive([.2,.12,.07],state))`);for(const p of ['gold','portra','ektar'])assert.equal(h.run(`rollShared.profile='${p}';JSON.stringify(technicalPositive([.2,.12,.07],state))`),q);});
await test('Preview and 16-bit export share exact pixel function',()=>{h.run(`rollShared.profile='generic';rollShared.strength=0;const out=convertImage(previewSrc,'positive',state,base);`);const d=h.run(`(()=>{const p=technicalPositive(sourcePixel(working,25,20),state),q=technicalPositive(sourcePixel(workingPreview,25,20),state);return Math.max(...p.map((v,c)=>Math.abs(v-q[c])));})()`);assert.ok(d<1/65535);});
await test('Crop edit recalculates analysis and persists only active frame',()=>{const before=h.run('JSON.stringify(calibration)');h.run('cropRegion={x:.3,y:.3,w:.4,h:.4};cropChanged();');assert.notEqual(h.run('JSON.stringify(calibration)'),before);assert.equal(h.run('roll[0].crop.w'),.4);assert.equal(h.run('roll[1].crop.w'),.6);});
await test('TIFF output contains a valid sRGB ICC and 16-bit samples',()=>{h.run(`const head=tiffHeader(2,2);const ab=new ArrayBuffer(head.byteLength+24);new Uint8Array(ab).set(new Uint8Array(head));const dv=new DataView(ab);for(let i=0;i<12;i++)dv.setUint16(head.byteLength+i*2,i*1000,true);const rt=parseTiff16(ab);`);assert.equal(h.run('rt.width'),2);assert.equal(h.run('rt.data[10]'),10000);assert.ok(h.run('rt.icc.length>500'));});
await test('8-bit TIFF remains readable',()=>{h.run(`const head8=makeTiffHeader(2,2,158),buf8=new ArrayBuffer(170);new Uint8Array(buf8).set(new Uint8Array(head8));const dv8=new DataView(buf8);for(let i=0;i<3;i++)dv8.setUint16(146+i*2,8,true);dv8.setUint32(10+8*12+8,12,true);const t8=parseTiff16(buf8);`);assert.equal(h.run('t8.width'),2);});
await test('Theme and rotation preserve crop and calibration',()=>{const before=h.run('JSON.stringify(calibration)'),crop=h.run('JSON.stringify(cropRegion)');h.run(`applyTheme('light');rotateBy(90);applyTheme('dark');`);assert.equal(h.run('state.rotation'),90);assert.equal(h.run('JSON.stringify(calibration)'),before);assert.equal(h.run('JSON.stringify(cropRegion)'),crop);});
await test('Color reset returns controls to defaults and preserves geometry',()=>{h.run(`state.exposure=1;state.manualCalibration={shape:[1,.5,.2],kind:'manual'};$('reset').onclick();`);assert.equal(h.run('state.exposure'),0);assert.equal(h.run('state.engine'),'calibrated4');assert.equal(h.run('state.rotation'),90);assert.equal(h.run('state.manualCalibration'),null);});
await test('Contrast increases dark/light separation toward the right and decreases to the left',()=>{
 const vals=h.run(`(()=>{rollShared.profile='generic';rollShared.strength=0;rollShared.print='neutral';const opts={...defaultState(),autoLevels:false};const evaluate=(contrast)=>{opts.contrast=contrast;return [.25,.75].map(v=>develop([v*255,v*255,v*255],[255,255,255],{...opts,noBase:true},255)[0]);};return {low:evaluate(.7),neutral:evaluate(1),high:evaluate(1.4)};})()`);
 assert.ok(Math.abs(vals.high[1]-vals.high[0])>Math.abs(vals.neutral[1]-vals.neutral[0]));
 assert.ok(Math.abs(vals.low[1]-vals.low[0])<Math.abs(vals.neutral[1]-vals.neutral[0]));
});
await test('Increasing Shadows darkens shadows in both tonal implementations',()=>{
 const result=h.run(`(()=>{const opts={...defaultState()};const test=(fn)=>{opts.shadows=-60;const lighter=fn([.2,.2,.2],opts)[0];opts.shadows=60;const darker=fn([.2,.2,.2],opts)[0];return {lighter,darker};};return [test(applyTonalZones),test(applyTonalZones)];})()`);
 assert.ok(result.every(x=>x.darker<x.lighter));
});
await test('Double-click restoration uses each original slider default and saves active frame',()=>{
 h.run(`state.exposure=1.5;state.contrast=.6;state.shadow=.08;restoreSliderDefault($('exposure'),'exposure');restoreSliderDefault($('contrast'),'contrast');restoreSliderDefault($('shadow'),'shadow');`);
 assert.equal(h.run('state.exposure'),0);
 assert.equal(h.run('state.contrast'),1);
 assert.equal(h.run('state.shadow'),.015);
 assert.equal(h.run('roll[0].settings.shadow'),.015);
 assert.equal(h.run('Number($("shadow").value)'),500);
});
await test('Fix 11 allows export with an uncertain crop',()=>{h.run('state.cropConfirmed=false;');assert.equal(h.run('exportReady()'),true);h.run(`$('cropConfirm').onclick()`);assert.equal(h.run('exportReady()'),true);});
await test('JPEG export uses crop and rotation; TIFF writes same samples',async()=>{h.run('state.cropExport=true;state.rotation=90;');const expected=h.run('CE.exportGeometry(working,cropRegion,true,90)');assert.equal(h.run('makeExportCanvas().width'),expected.width);const bytes=await h.run('jpegBytes()');assert.ok(bytes.length>0);await h.run(`downloadBlob=(b,n)=>{globalThis.savedBlob=b;};exportTiff()`);const buf=await h.context.savedBlob.arrayBuffer();h.set('globalThis.__tiff',buf);assert.ok(h.run('parseTiff16(__tiff).icc.length>0'));});
await test('Queue clear disables export and removes crop overlay state',()=>{h.run(`exportBusy=false;rollLoading=false;$('clearQueue').onclick();`);assert.equal(h.run('working'),null);assert.equal(h.run('roll.length'),0);assert.equal(h.elements.get('export').disabled,true);});
console.log(`${n} integration checks passed (DOM harness; not a browser UI test)`);
