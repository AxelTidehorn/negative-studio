/* Capture a pre-refactor oracle, or verify it with current production kernels.
   Uses synthetic transmission and actual bounded linear RAW previews; no mocks
   of color math. Output files record every config and full uint16 export hash. */
import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';import {harness} from '../tests/helpers/app-harness.mjs';
const file='tests/fixtures/consolidation/oracle.json',capture=process.argv.includes('--capture'),h=harness({initialEngine:'calibrated4'});h.context.crypto=globalThis.crypto;
const digest=v=>crypto.createHash('sha256').update(Buffer.from(v.buffer,v.byteOffset,v.byteLength)).digest('hex'),rows=[];
function synthetic(space){const width=67,height=45,data=Float32Array.from({length:width*height*3},(_,i)=>i<36?[0,1/65535,.0001,.001,.01,.18,.5,1,.9999,1e-8,.7,.07][i%12]:.005+((i*673+71)%65536)/65535*.89);return {width,height,data,channels:3,encoding:'linear',scale:1,colorSpace:space};}
const images={srgb:synthetic('srgb'),rec2020:synthetic('rec2020')};for(const id of ['8983','9235']){const meta=JSON.parse(fs.readFileSync(`tests/fixtures/frame-real/dsf${id}.json`)),b=zlib.gunzipSync(fs.readFileSync(`tests/fixtures/frame-real/dsf${id}.f32.gz`));images[id]={...meta,data:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}
const setups=[];
if(capture){for(const [name,im]of Object.entries(images))for(const engine of (im.colorSpace==='rec2020'?['calibrated4','v2']:['calibrated4'])){
 h.set('im',im);h.run(`render=()=>{};scheduleRender=()=>{};working=im;workingPreview=im;src=new ImageData(im.width,im.height);previewSrc=src;sourceInfo={encoding:'linear',colorSpace:im.colorSpace,label:'oracle',domain:'oracle'};state={...defaultState(),engine:${JSON.stringify(engine)},cropConfirmed:true};cropRegion={x:.1,y:.1,w:.8,h:.8};roll=[{file:{name:'oracle.dng'},settings:{...state},crop:{...cropRegion},geometry:NSGeometry.create()}];activeFrame=0;analyzeLevels();`);
 const config=JSON.parse(h.run('JSON.stringify(configuration38())'));if(engine==='calibrated4')for(const colorMode4 of ['legacy','original','robust'])for(const toneMode4 of ['smooth','reference'])setups.push({name,config:{...config,opts:{...config.opts,colorMode4,toneMode4}}});else setups.push({name,config});
 }}else setups.push(...JSON.parse(fs.readFileSync(file)).setups);
const profiles=['neutral','film.kodak-gold-200','film.kodak-ektar-100','film.fuji-pro-400h','film.kodak-portra-400','creative.backstreet','creative.afterglow','creative.pale-static','creative.redline','mono.neutral'];
for(const s of setups){const im=images[s.name],K=h.context.NSPixelKernel;
 for(const profile of profiles)for(const strength of [0,.35,.7,1])for(const edit of [false,true]){
  const c=structuredClone(s.config);c.look={id:profile==='mono.neutral'?'neutral':profile,strength};c.monochrome=profile==='mono.neutral';if(edit)Object.assign(c.opts,{exposure:.35,contrast:1.18,gamma:.9,shadows:21,highlights:-17,temperature:8,tint:-5,saturation:1.2,vibrance:30});
  const k=K.compile(c),out=new Float64Array(39*3);for(let i=0;i<39;i++){const n=Math.floor(i*(im.width*im.height-1)/38)*3,p=Array.from(im.data.subarray(n,n+3));out.set(k.pixel(p),i*3);}
  rows.push({source:s.name,engine:c.kind,profile,strength,edit,hash:digest(out)});
 }
 // Every retained engine's exact exported uint16 pixels, including bilinear
 // fine rotation and composition, via the existing production sampler.
 for(const rotation of [0,90,2]){const model=h.context.NSGeometry.create(rotation===90?90:0);model.rotation.fineDegrees=rotation===2?2:0;const g=h.context.NSPresentation.plan(im,model,true,{x:.1,y:.1,w:.8,h:.8}),pixels=h.context.NSPresentation.tiff(im,s.config,g,0,g.height,K.prepare(im,s.config));rows.push({source:s.name,engine:s.config.kind,export:true,rotation,size:[g.width,g.height],hash:digest(pixels)});}
}
if(capture){fs.writeFileSync(file,JSON.stringify({baseline:'42a9d33 (main after PR97)',kind:'synthetic plus bounded actual-RAW linear source data; exact Float64 output and Uint16 exports',setups,rows},null,2)+'\n');console.log('CAPTURE',rows.length,'numeric/export cases');}
else{const expected=JSON.parse(fs.readFileSync(file)).rows;let bad=0;for(let i=0;i<rows.length;i++)if(rows[i].hash!==expected[i].hash){bad++;console.error('DIFF',JSON.stringify({...rows[i],pixels:undefined}),expected[i].hash);}if(bad)throw Error(bad+' numeric/export regressions');console.log('PASS',rows.length,'exact numeric/export cases vs pre-consolidation main');}
