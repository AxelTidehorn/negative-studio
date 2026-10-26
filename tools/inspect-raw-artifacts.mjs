import {readSource} from '../tests/helpers/source.mjs';
/* Read-only diagnostic. Never changes input files, defaults, profiles or color math.
   Usage: node tools/inspect-raw-artifacts.mjs image.RAF [other.RAF ...]
   FILMLABB_BASELINE: commit with the same calibrated4 config contract (default Fix 11).
   FILMLABB_SAMPLE_LIMIT: bounded source samples, default 100000. Counts are NOT a
   photographic classification of noise, grain, or the user's reported artifacts. */
import vm from 'node:vm';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import factory from '../node_modules/libraw-wasm/dist/libraw.js';
import {harness} from '../tests/helpers/app-harness.mjs';
const paths=process.argv.slice(2);if(!paths.length)throw Error('Usage: node tools/inspect-raw-artifacts.mjs image.RAF [other.RAF ...] (run npm ci first)');
const baseline=process.env.FILMLABB_BASELINE||'2773bb9';if(!/^[a-f0-9]{7,40}$/.test(baseline))throw Error('Baseline must be a commit SHA');
const limit=Number(process.env.FILMLABB_SAMPLE_LIMIT||100000);if(!Number.isSafeInteger(limit)||limit<1||limit>10000000)throw Error('Invalid sample limit');
const old=file=>execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:8*1024*1024}),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=['raw-decoder.js','package.json','package-lock.json','flat-field.js','color-management.js','raw-input.js','render-core.js','color-calibration.js','color-analysis.js','image-model.js','gpu-renderer.js','creative-profiles.js','source-analysis.js','beta4.js'];
const code=Object.fromEntries(files.map(f=>[f,{current:hash(readSource(f)),baseline:hash(old(f))}]));
const previous={console,Uint8Array,Uint16Array,Float32Array,Float64Array};vm.createContext(previous);
for(const file of ['creative-profiles.js','raw-input.js','render-core.js'])vm.runInContext(old(file),previous,{filename:baseline+':'+file});
if(!old('render-core.js').includes("kind==='calibrated4'"))throw Error('Baseline does not support the calibrated4 config contract; choose a comparable version');
const L=await factory({wasmBinary:readSource(new URL('../node_modules/libraw-wasm/dist/libraw.wasm',import.meta.url))}),h=harness();
h.run('render=()=>{};scheduleRender=()=>{};');
const report={baseline,baselineKnownGoodForReportedRAF:false,current:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),decoder:'libraw-wasm 1.6.0',sampleLimit:limit,code,images:[]};
for(const filename of paths){
 const bytes=new Uint8Array(readSource(filename)),entry={filename,sha256:hash(bytes),modes:[]};
 for(const mode of ['reference','protected','wide']){
  const decoder=new L.LibRaw();let decoded;const t=performance.now();
  try{decoder.open(bytes,h.context.NSRawInput.options(mode));const r=decoder.imageData();decoded={...r,data:Uint16Array.from(r.data)};}finally{decoder.delete();}
  const original=Uint16Array.from(decoded.data),oldIm=previous.NSRawInput.convert({...decoded,data:Uint16Array.from(original)},mode),im=h.context.NSRawInput.convert(decoded,mode);
  let sourceDifferences=0;for(let i=0;i<im.data.length;i++)if(im.data[i]!==oldIm.data[i])sourceDifferences++;
  const source={...im,channels:3,scale:im.scale||65535,encoding:'linear'};
  h.set('working',source);h.run(`state={...defaultState(),engine:'calibrated4',cropConfirmed:true,rawMode4:'${mode}'};sourceInfo={encoding:'linear',colorSpace:working.colorSpace||'srgb',rawMode4:'${mode}',label:'diagnostic'};workingPreview=CE.preview(working,1400);cropRegion=CE.detectFrame(workingPreview).region;src=new ImageData(workingPreview.width,workingPreview.height);previewSrc=src;analyzeLevels();`);
  const config=JSON.parse(h.run('JSON.stringify(configuration38())')),prepared=h.context.NSPixelKernel.prepare(source,config),prior=previous.NSPixelKernel.prepare({...source,...oldIm,channels:3,scale:oldIm.scale||65535,encoding:'linear'},config);
  const step=Math.max(1,Math.ceil(im.width*im.height/limit)),zero=[0,0,0],low=[0,0,0];let samples=0,nonfinite=0,blueVioletCandidates=0,candidatesWithLowInput=0,maxColorDelta=0;
  for(let n=0;n<im.width*im.height;n+=step){const i=n*3,p=prepared.pixel(i),q=prior.pixel(i);samples++;for(let k=0;k<3;k++){const value=source.data[i+k]/source.scale;if(value===0)zero[k]++;if(value<=1/65535)low[k]++;if(!Number.isFinite(p[k]))nonfinite++;maxColorDelta=Math.max(maxColorDelta,Math.abs(p[k]-q[k]));}
   const candidate=p[2]>.75&&p[2]-p[1]>.3&&p[2]-p[0]>.1||Math.min(p[0],p[2])>.65&&Math.min(p[0],p[2])-p[1]>.25;
   if(candidate){blueVioletCandidates++;if([0,1,2].some(k=>source.data[i+k]/source.scale<=1/65535))candidatesWithLowInput++;}
  }
  entry.modes.push({mode,width:im.width,height:im.height,seconds:+((performance.now()-t)/1000).toFixed(2),sourceDifferences,calibration:config.cal.beta4,analysisFrame:JSON.parse(h.run('JSON.stringify(cropRegion)')),samples,zero,low,nonfinite,maxColorDelta,blueVioletCandidates,candidatesWithLowInput,inputDiagnostics:im.inputDiagnostics4||null});
 }
 report.images.push(entry);
}
console.log(JSON.stringify(report,null,2));
