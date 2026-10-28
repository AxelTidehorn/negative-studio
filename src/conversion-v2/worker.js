/* One persistent owner of the full Float32 source. Only small previews/metadata
   leave the worker. Same classic-worker pattern as FILMLABB's existing workers. */
importScripts('./file-formats.js','./raw-input.js','./raw-decoder.js','./tiff-codec.js','./image-model.js','./film-base-measurement.js','./color-analysis.js','./color-calibration.js','./project-settings.js','./color-parameters.js','./render-core.js','./srgb-profile.js','./tiff-header.js','./v2-core.js','./v2-render.js','./v2-base.js','./v2-diagnostics.js','./v2-output.js','./v2-fast.js');
'use strict';
const V=NSConversionV2,R=NSV2Render,O=NSV2Output,F=NSV2Fast;
// MessageChannel yields to incoming jobs without background-tab timer clamps.
const scheduler=new MessageChannel(),resumers=[];scheduler.port1.onmessage=()=>resumers.shift()?.();
self.NSV2Yield=()=>new Promise(resolve=>{resumers.push(resolve);scheduler.port2.postMessage(0);});
let image,source,capture,base,previous,proposal,k,intent,legacy,fast,fastA,active=0;
const cache=new Map(),metrics={jobs:0,qualityRenders:0,cacheHits:0,cacheBytes:0};
function snapshot(){return {source,base,calibration:k?.calibration,intent,legacy,proposal,metrics:{...metrics,sourceBytes:image?.data.byteLength||0}};}
function progress(id,stage,done=0,total=1){postMessage({id,type:'progress',stage,done,total});}
function check(id){if(id!==active)throw Object.assign(Error('Avbrutet'),{name:'AbortError'});}
function job(id){let last=performance.now();return {check:()=>check(id),async tick(stage,done,total){check(id);if(performance.now()-last>12){progress(id,stage,done,total);await self.NSV2Yield();check(id);last=performance.now();}}};}
function clearCache(){cache.clear();metrics.cacheBytes=0;}
function parameters(){
 k=V.compile(source,base,V.prior,capture);if(!intent){const start=performance.now();intent=R.analyze(image,k);metrics.toneAnalysisMs=performance.now()-start;}
 const start=performance.now(),region={x:0,y:0,w:1,h:1},response=NSColorCalibration.estimate(image,region,{base:base.rgb,light:[1,1,1],domain:'linear-rec2020'});
 legacy=V.freeze(V.clone({kind:'calibrated4',opts:{...NSProjectSettings.imageDefaults(),shadow:0,highlight:1,editVersion:1},workingSpace:'rec2020',cal:{beta4:NSColorCalibration.analyze(image,region,response)},profile:{type:'color'},print:{},neutralProfile:true,neutralPrint:true,strength:0}));
 metrics.legacyAnalysisMs=performance.now()-start;fast=F.compile(k,intent);fastA=F.compileLegacy(legacy);clearCache();
}
async function negative(id,limit){
 const start=performance.now(),scale=Math.min(1,limit/Math.max(image.width,image.height)),width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale)),data=new Uint8ClampedArray(width*height*4),p=new Float64Array(3),j=job(id);
 for(let y=0;y<height;y++){const sy=Math.min(image.height-1,Math.floor((y+.5)*image.height/height));for(let x=0;x<width;x++){const sx=Math.min(image.width-1,Math.floor((x+.5)*image.width/width)),i=(sy*image.width+sx)*3,o=(y*width+x)*4;F.display(image.data[i],image.data[i+1],image.data[i+2],p);for(let c=0;c<3;c++)data[o+c]=Math.round(R.encode(p[c])*255);data[o+3]=255;}await j.tick('negative',y+1,height);}
 metrics.negativeMs=performance.now()-start;return {negative:{width,height,data},snapshot:snapshot()};
}
async function load(m){
 const t=performance.now();progress(m.id,/\.tiff?$/i.test(m.file.name)?'tiff':'raw');let raw,recipe,wb=null,camera=null,format,verification='decoder';
 if(/\.tiff?$/i.test(m.file.name)){
  if(!m.tiffConfirmed)throw Error('TIFF_DOMAIN_CONFIRMATION_REQUIRED');raw=await NSTiff.decode(await m.file.arrayBuffer());check(m.id);if(raw.icc)throw Error('TIFF_ICC_NOT_VERIFIED');raw={...raw,data:Float32Array.from(raw.data,v=>v/65535),scale:1,colorSpace:'rec2020'};recipe={decoder:'filmlabb-tiff',version:'1',options:null};format='TIFF';verification='user-verified-recipe';
 }else{
  const options={...NSRawInput.options('wide'),useAutoWb:false,noInterpolation:false,halfSize:false,userQual:3,useCameraMatrix:3,highlight:0,threshold:0},result=await NSRawDecoder.decode(m.file,'wide',{options});check(m.id);raw=result.im;recipe={decoder:result.provenance.decoder,version:result.provenance.version,options};wb=result.meta?.color_data?.cam_mul||null;camera=result.meta?.camera_model||null;format=result.provenance.format.toUpperCase();
 }
 metrics.rawDecodeMs=performance.now()-t;image={width:raw.width,height:raw.height,data:raw.data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'};const revision=V.uuid();source=V.source(image,{format,revision,recipe,bitDepth:raw.bits||16,verification});capture=V.capture({session:m.session||'local-session',recipe:{...recipe,camera,compatibilityGuard:wb&&camera?null:revision},whiteBalance:wb});
 return negative(m.id,m.limit);
}
// Temporary point-sampled positive preview, explicitly never cached/exported.
async function quickPair(m){
 const im=image,g=O.geometry(im,m.crop,m.rotation,Math.min(600,m.limit)),a=new Uint8ClampedArray(g.width*g.height*4),b=new Uint8ClampedArray(a.length),p=new Float64Array(3),sampleA=fastA.pixel,sampleB=fast.pixel,j=job(m.id),t=performance.now();
 for(let y=0;y<g.height;y++){const sy=Math.min(g.sourceHeight-1,Math.floor((y+.5)*g.sourceHeight/g.height));for(let x=0;x<g.width;x++){
  const sx=Math.min(g.sourceWidth-1,Math.floor((x+.5)*g.sourceWidth/g.width)),u=g.rotation===90?g.x+sy:g.rotation===180?g.x+g.w-1-sx:g.rotation===270?g.x+g.w-1-sy:g.x+sx,v=g.rotation===90?g.y+g.h-1-sx:g.rotation===180?g.y+g.h-1-sy:g.rotation===270?g.y+sx:g.y+sy,i=(v*im.width+u)*3,o=(y*g.width+x)*4;
  sampleA(im.data[i],im.data[i+1],im.data[i+2],p);for(let c=0;c<3;c++)a[o+c]=Math.round(R.encode(p[c])*255);
  sampleB(im.data[i],im.data[i+1],im.data[i+2],p);for(let c=0;c<3;c++)b[o+c]=Math.round(R.encode(p[c])*255);a[o+3]=b[o+3]=255;
 }await j.tick('compare',y+1,g.height);}
 metrics.quickPreviewMs=performance.now()-t;check(m.id);postMessage({id:m.id,type:'quick',width:g.width,height:g.height,a,b},[a.buffer,b.buffer]);
}
async function pair(m){
 if(!fast)throw Error('ACCEPT_BASE_FIRST');const key=JSON.stringify([source.revision,base.id,intent.id,m.crop,m.rotation,m.limit]),cached=cache.get(key);
 if(cached){metrics.cacheHits++;return {...cached,a:cached.a.slice(),b:cached.b.slice(),cacheHit:true,snapshot:snapshot()};}
 // A box-filtered level can be rotated by exact pixel permutation. No new
 // inversion or interpolation is needed for the same source rectangle.
 const target=O.geometry(image,m.crop,m.rotation,m.limit);
 for(const entry of cache.values())if(JSON.stringify(entry.crop)===JSON.stringify(m.crop)){
  const delta=(m.rotation-entry.rotation+360)%360,w=delta%180?entry.height:entry.width,h=delta%180?entry.width:entry.height;
  if(w!==target.width||h!==target.height)continue;
  const a=new Uint8ClampedArray(entry.a.length),b=new Uint8ClampedArray(entry.b.length),j=job(m.id);
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){const sx=delta===90?y:delta===180?entry.width-1-x:delta===270?entry.width-1-y:x,sy=delta===90?entry.height-1-x:delta===180?entry.height-1-y:delta===270?x:y,i=(sy*entry.width+sx)*4,o=(y*w+x)*4;for(let c=0;c<4;c++){a[o+c]=entry.a[i+c];b[o+c]=entry.b[i+c];}}await j.tick('compare',y+1,h);}
  metrics.cacheHits++;return {width:w,height:h,a,b,crop:m.crop,rotation:m.rotation,quality:'exact-positive-box-area',cacheHit:true,snapshot:snapshot()};
 }
 if(m.quick)await quickPair(m);
 const im=image,g=target,sampleA=fastA.pixel,sampleB=fast.pixel,j=job(m.id),t=performance.now();metrics.qualityRenders++;
 const a=await O.area(im,g,sampleA,8,{check:j.check,tick:(done,total)=>j.tick('compare',done,total*2)}),b=await O.area(im,g,sampleB,8,{check:j.check,tick:(done,total)=>j.tick('compare',total+done,total*2)});
 check(m.id);metrics.previewMs=performance.now()-t;const entry={width:g.width,height:g.height,a,b,crop:m.crop,rotation:m.rotation,quality:'exact-positive-box-area'};
 // At most two complete A/B levels. Source and export never enter this cache.
 while(cache.size>=2){const first=[...cache.keys()].find(key=>{const e=cache.get(key);return !(e.rotation===0&&e.crop.x===0&&e.crop.y===0&&e.crop.w===1&&e.crop.h===1);})||cache.keys().next().value,old=cache.get(first);metrics.cacheBytes-=old.a.byteLength+old.b.byteLength;cache.delete(first);}
 cache.set(key,entry);metrics.cacheBytes+=a.byteLength+b.byteLength;return {...entry,a:a.slice(),b:b.slice(),cacheHit:false,snapshot:snapshot()};
}
async function exportImage(m){
 if(!fast)throw Error('ACCEPT_BASE_FIRST');const t=performance.now(),im=image,g=O.geometry(im,m.crop,m.rotation),sample=m.engine==='A'?fastA.pixel:fast.pixel,j=job(m.id),parts=m.format==='tiff'?[tiffHeader(g.width,g.height)]:[],little=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
 metrics.exportPixels=g.width*g.height;metrics.exportStripeBytes=g.width*8*(m.format==='tiff'?6:4);
 if(m.format==='tiff'&&g.width*g.height*6>=4294960000)throw Error('TIFF_TOO_LARGE');
 let canvas,context;
 if(m.format==='jpeg'&&typeof OffscreenCanvas!=='undefined'&&OffscreenCanvas.prototype.convertToBlob){canvas=new OffscreenCanvas(g.width,g.height);context=canvas.getContext('2d',{colorSpace:'srgb'});if(!context)throw Error('JPEG_CANVAS_LIMIT_OR_MEMORY');}
 try{
  for(let y=0;y<g.height;y+=8){const rows=Math.min(8,g.height-y);
   if(m.format==='tiff'){
    const out=O.fastRows(im,g,y,rows,sample,16);if(little)parts.push(out);else{const bytes=new Uint8Array(out.length*2),view=new DataView(bytes.buffer);for(let i=0;i<out.length;i++)view.setUint16(i*2,out[i],true);parts.push(bytes);}
   }else{
    const data=O.fastRows(im,g,y,rows,sample);if(context)context.putImageData(new ImageData(data,g.width,rows),0,y);else{postMessage({id:m.id,type:'jpeg-stripe',y,rows,width:g.width,height:g.height,data},[data.buffer]);}
   }
   await j.tick('export',y+rows,g.height);
  }
  check(m.id);let blob;
  if(m.format==='tiff')blob=new Blob(parts,{type:'image/tiff'});
  else if(canvas){progress(m.id,'encode');blob=await canvas.convertToBlob({type:'image/jpeg',quality:.95});check(m.id);if(blob?.type!=='image/jpeg'||!blob.size)throw Error('JPEG_CANVAS_LIMIT_OR_MEMORY');}
  metrics.exportMs=performance.now()-t;return {blob,canvasFallback:m.format==='jpeg'&&!canvas,width:g.width,height:g.height,snapshot:snapshot()};
 }finally{if(canvas)canvas.width=canvas.height=0;}
}
function loupe(m){if(!image)return;const size=24,data=new Uint8ClampedArray(size*size*4),p=new Float64Array(3),sx=Math.floor(m.point.x*image.width),sy=Math.floor(m.point.y*image.height);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=Math.max(0,Math.min(image.width-1,sx+x-12)),v=Math.max(0,Math.min(image.height-1,sy+y-12)),i=(v*image.width+u)*3,o=(y*size+x)*4;F.display(image.data[i],image.data[i+1],image.data[i+2],p);for(let c=0;c<3;c++)data[o+c]=Math.round(R.encode(p[c])*255);data[o+3]=255;}postMessage({type:'loupe',seq:m.seq,data},[data.buffer]);}
self.onmessage=async({data:m})=>{
 if(m.type==='cancel'){if(m.id===active)active=0;return;}
 if(m.type==='loupe'){loupe(m);return;}
 active=m.id;metrics.jobs++;const t=performance.now();
 try{
  let result;
  if(m.type==='load'){clearCache();base=previous=proposal=k=intent=legacy=fast=fastA=null;result=await load(m);}
  else if(m.type==='source'){image=m.image;source=m.source;capture=m.capture;V.validateSource(source,image);clearCache();base=previous=proposal=k=intent=legacy=fast=fastA=null;result=await negative(m.id,m.limit);}
  else if(!image)throw Error('SOURCE_MISSING');
  else if(m.type==='measure'){proposal=NSV2Base.measure(image,source,m.regions);metrics.baseMeasureMs=performance.now()-t;result={proposal,snapshot:snapshot()};}
  else if(m.type==='detect'){progress(m.id,'base');proposal=await NSV2Base.detect(image,source,()=>check(m.id),(done,total)=>progress(m.id,'base',done,total));metrics.baseDetectMs=performance.now()-t;result={proposal,snapshot:snapshot()};}
  else if(m.type==='accept'||m.type==='prior'||m.type==='reuse'||m.type==='undo'){
   if(m.type==='undo'){if(!previous)throw Error('NO_PREVIOUS_BASE');[base,previous]=[previous,base];}
   else{const next=m.type==='prior'?V.assumed([1,1,1],source,capture):m.type==='reuse'?m.base:V.accept(proposal,source,capture);if(!V.compatible(next.capture,capture))throw Error('BASE_INCOMPATIBLE');previous=base;base=next;}
   parameters();postMessage({id:m.id,type:'state',snapshot:snapshot()});result=await pair(m);
  }else if(m.type==='tone'){if(!k)throw Error('ACCEPT_BASE_FIRST');intent=R.analyze(image,k);parameters();postMessage({id:m.id,type:'state',snapshot:snapshot()});result=await pair(m);}
  else if(m.type==='pair')result=await pair(m);
  else if(m.type==='export')result=await exportImage(m);
  else if(m.type==='diagnostic'){const report=NSV2Diagnostics.diagnostic(image,k,intent);report.performance={status:'measured',value:{...metrics},methodVersion:'worker-scalar-box-1'};result={blob:new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),snapshot:snapshot()};}
  else throw Error('UNKNOWN_JOB');
  check(m.id);const transfer=[];if(result.negative)transfer.push(result.negative.data.buffer);if(result.a)transfer.push(result.a.buffer,result.b.buffer);postMessage({id:m.id,type:'done',...result},transfer);
 }catch(e){postMessage({id:m.id,type:e.name==='AbortError'?'cancelled':'error',error:e.message});}
};
