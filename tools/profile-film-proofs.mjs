/* Reproducible proofs from #90's archived Neutral exports (not a RAW rerender).
   node tools/profile-film-proofs.mjs ARCHIVE_ROOT PRIVATE_OUTPUT
   Both input photographs and outputs stay outside Git. Neutral RGB16 details
   retain original coordinates; overview input is already quantized to RGB8.
   Append --work-p for Neutral / pre-Work Gold / Gold P / Portra P at 70%. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import vm from 'node:vm';import {execFileSync} from 'node:child_process';
import {decodePng} from '../tests/helpers/png.mjs';
import '../src/editing/editing-engine.js';import '../src/editing/profile-catalog.js';import '../src/editing/profile-engine.js';import '../src/export/png-encoder.js';
const [inputArg,outArg]=process.argv.slice(2);if(!inputArg||!outArg)throw Error('ARCHIVE_ROOT PRIVATE_OUTPUT required');
const input=path.resolve(inputArg),out=path.resolve(outArg);for(const p of [input,out])if(p===process.cwd()||p.startsWith(process.cwd()+path.sep))throw Error('Keep private images outside repository');fs.mkdirSync(out,{recursive:true});
const workP=process.argv.includes('--work-p'),baseline='22b641818c1836548dc3ca335f39054073148dbb';let prior;
if(workP){
 // Frozen baseline exists only in this offline process, never in the app catalog.
 const context=vm.createContext({});
 for(const file of ['editing-engine','profile-catalog','profile-engine'])vm.runInContext(execFileSync('git',['show',baseline+':src/editing/'+file+'.js'],{encoding:'utf8'}),context);
 prior=context.NSProfiles.compile({id:'film.kodak-gold-200',strength:.7});
}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),variants=workP?[
 ['neutral','neutral',0],['previous-gold70','film.kodak-gold-200@1',.7],['gold-p70','film.kodak-gold-200',.7],['portra-p70','film.kodak-portra-400',.7],
]:[['neutral','neutral',0],...Object.keys(NSProfileCatalog.profiles).flatMap(id=>[.35,.7,1].map(s=>[id.split('.')[1]+Math.round(s*100),id,s]))];
const manifest={baseline:'merged PR #90 Neutral exports; technical conversion, exposure and editing already baked in and unchanged',caveat:'RGB8 overviews and RGB16 detail crops are reprocessed quantized positives, not new RAW/native full-frame exports. Do not use these to claim full-frame clipping or stock calibration.',catalogSHA256:sha(fs.readFileSync('src/editing/profile-catalog.js')),operatorSHA256:sha(fs.readFileSync('src/editing/profile-engine.js')),variants,files:[]};
if(workP)manifest.previousGoldCommit=baseline;
for(const dir of ['overview','detail-crops'])for(const name of fs.readdirSync(path.join(input,dir)).filter(n=>n.endsWith('_neutral.png')&&!n.includes('_A_')).sort()){
 const source=fs.readFileSync(path.join(input,dir,name)),im=decodePng(source),scale=im.bits===16?65535:255,record={source:dir+'/'+name,sourceSHA256:sha(source),width:im.width,height:im.height,bits:im.bits,variants:[]};
 assert.ok(im.srgb);if(dir==='detail-crops')assert.equal(im.bits,16);
 for(const [label,id,strength] of variants){
  const kernel=id.endsWith('@1')?prior:NSProfiles.compile({id,strength}),rgb=im.bits===16?new Uint16Array(im.data.length):new Uint8Array(im.data.length);let delta=0,endpoints=0;const began=performance.now();
  for(let i=0;i<rgb.length;i+=3){const p=Array.from(im.data.subarray(i,i+3),v=>v/scale),q=kernel.pixel(p);for(let c=0;c<3;c++){assert.ok(Number.isFinite(q[c])&&q[c]>=0&&q[c]<=1);rgb[i+c]=Math.round(q[c]*scale);delta+=Math.abs(q[c]-p[c]);}if(rgb.subarray(i,i+3).some(v=>v===scale))endpoints++;}
  const operatorMs=performance.now()-began,encoder=NSPng.create(im.width,im.height,im.bits);await encoder.write(rgb,im.height);const bytes=Buffer.from(await(await encoder.finish()).arrayBuffer()),filename=name.replace('_neutral.png','_'+label+'.png');fs.writeFileSync(path.join(out,filename),bytes);const decoded=decodePng(bytes);assert.deepEqual(decoded.data,rgb);if(id==='neutral')assert.deepEqual(rgb,im.data);
  record.variants.push({label,id,strength,file:filename,sha256:sha(bytes),meanAbsoluteEncodedDelta:delta/rgb.length,anyMaximumCode:endpoints,operatorMs});
 }
 manifest.files.push(record);console.log('PROOF',dir,name);
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
