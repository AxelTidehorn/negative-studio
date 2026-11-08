import assert from 'node:assert/strict';import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
import {gpuGLSL} from '../tools/v2-presentation-model.mjs';
ensureBuild();const h=await browserHarness(),model=fs.readFileSync('tools/v2-presentation-model.mjs','utf8').replace(/^export /gm,''),renderer=fs.readFileSync('src/render/gpu-renderer.js','utf8'),results=[];
try{const page=await h.browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);await page.locator('#imageFile').setInputFiles('tests/fixtures/synthetic-negative.dng');await page.waitForFunction(()=>working&&!rollLoading);
 await page.addScriptTag({content:'(function(){'+model+';globalThis.PresentationReview={install,gpuGLSL};})();'});
 for(const target of ['C','D']){
  const glsl=await page.evaluate(()=>NSV2GpuMath.glsl);await page.evaluate(glsl=>{NSV2GpuMath.glsl=glsl;},gpuGLSL(glsl,target));await page.addScriptTag({content:renderer});
  const result=await page.evaluate(async target=>{
   const restore=PresentationReview.install(NSV2Render,target),width=53,height=37,rgb=[.8,.45,.2],data=new Float32Array(width*height*3);for(let n=0;n<width*height;n++)for(let c=0;c<3;c++)data[n*3+c]=rgb[c]*10**(-(.05+2.5*((n*(137+c*41)+c*17)%65535)/65535));
   const im={width,height,data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'},base=configuration38(),recipe=NSV2Platform.prepare(im,{sourceKey:'presentation-probe',recipe:{decoder:'fixture',version:'1'},capture:{session:'probe',recipe:{decoder:'fixture'}},measurement:{measured:rgb,kind:'manual-region'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'},algorithmVersion:3,photographic:2}),config={...base,kind:'v2',workingSpace:'rec2020',v2:recipe,opts:{...NSEditing2.neutral,editVersion:2},profile:{type:'color'},neutralProfile:true,neutralPrint:true,strength:0,print:{contrast:1,shoulder:0}},gpu=NSGpuPreview.create(document.createElement('canvas'));let max=0;
   for(const ev of [-4,0,4,10]){config.v2={...recipe,intent:{...recipe.intent,exposure:ev}};gpu.draw(im,config,'positive',width,1);const actual=gpu.read().data,k=NSPixelKernel.compile(config);for(let n=0;n<width*height;n++){const q=k.pixel(NSV2Platform.read(im,n*3));for(let c=0;c<3;c++)max=Math.max(max,Math.abs(actual[n*4+c]-Math.round(255*q[c])));}}
   config.v2={...recipe,intent:{...recipe.intent,exposure:0}};
   const preview=NSPixelKernel.render(im,config,'positive',width),previewKernel=NSPixelKernel.compile(config);let previewMax=0;
   for(let n=0;n<width*height;n++){const q=previewKernel.pixel(NSV2Platform.read(im,n*3));for(let c=0;c<3;c++)previewMax=Math.max(previewMax,Math.abs(preview.data[n*4+c]-Math.round(255*q[c])));}
   // Actual existing TIFF owner on the imported fixture, pinned to the same
   // experimental factor; full source resolution, no worker approximation.
   const frozen=configuration38();frozen.v2={...frozen.v2,intent:{...frozen.v2.intent,id:frozen.v2.intent.id+'-'+target}};configuration38=()=>frozen;rollShared.cropExportToFrame=false;state.cropExport=false;let blob;downloadBlob=b=>{blob=b;};await exportTiff();const buffer=await blob.arrayBuffer(),decoded=NSTiff.decodeSync(buffer),k=NSPixelKernel.compile(frozen);let tiffMax=0;
   for(let y=0;y<working.height;y++)for(let x=0;x<working.width;x++){const n=y*working.width+x,q=k.pixel(NSV2Platform.read(working,n*3));for(let c=0;c<3;c++)tiffMax=Math.max(tiffMax,Math.abs(decoded.data[n*3+c]-Math.round(65535*q[c])));}
   gpu.destroy();restore();return {target,maxRGB8Difference:max,previewMax,tiffMax,dimensions:[decoded.width,decoded.height],icc:decoded.icc.length};
  },target);assert.ok(result.maxRGB8Difference<=2,JSON.stringify(result));assert.ok(result.previewMax<=1);assert.equal(result.tiffMax,0);assert.equal(result.icc,588);assert.deepEqual(result.dimensions,[64,48]);results.push(result);
  const referenceRoots=(process.env.FILMLABB_V2_PRESENTATION_REFERENCES||'').split(',').filter(Boolean);
  for(const id of referenceRoots.length?['09','00','11','08','06']:[]){
   const root=referenceRoots.find(root=>fs.existsSync(root+'/'+id+'_source.json'));if(!root)throw Error('RAF_CACHE_MISSING '+id);
   const meta=JSON.parse(fs.readFileSync(root+'/'+id+'_source.json')),record=JSON.parse(fs.readFileSync(process.env.FILMLABB_V2_PRESENTATION_RECORDS+'/'+id+'_record.json')),bytes=fs.readFileSync(root+'/'+id+'_overview.f32');
   const parity=await page.evaluate(({meta,record,b64,target,id})=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),im={...meta.overview,data:new Float32Array(bytes.buffer)},restore=PresentationReview.install(NSV2Render,target),gpu=NSGpuPreview.create(document.createElement('canvas')),config={...configuration38(),kind:'v2',workingSpace:'rec2020',opts:{...NSEditing2.neutral,editVersion:2},profile:{type:'color'},neutralProfile:true,neutralPrint:true,strength:0,print:{contrast:1,shoulder:0},v2:{schema:'FILMLABB.V2Recipe',version:1,algorithmVersion:3,source:record.source,base:record.base,calibration:record.calibration,intent:record.after,analysisSignature:'presentation-raf-probe'}},kernel=NSPixelKernel.compile(config);gpu.draw(im,config,'positive',1400,1);const actual=gpu.read().data;let max=0,sum=0;for(let n=0;n<im.width*im.height;n++){const q=kernel.pixel(NSV2Platform.read(im,n*3));for(let c=0;c<3;c++){const d=Math.abs(actual[n*4+c]-Math.round(255*q[c]));max=Math.max(max,d);sum+=d;}}gpu.destroy();restore();return {id,target,maxRGB8Difference:max,meanRGB8Difference:sum/(im.width*im.height*3),pixels:im.width*im.height};},{meta,record,b64:bytes.toString('base64'),target,id});assert.ok(parity.maxRGB8Difference<=2,JSON.stringify(parity));results.push(parity);
  }
  await page.evaluate(glsl=>{NSV2GpuMath.glsl=glsl;},glsl);
 }
 if(process.env.FILMLABB_V2_PRESENTATION_REFERENCES)fs.writeFileSync('.cache/v2-presentation-raf-parity.json',JSON.stringify(results,null,2));
 assert.deepEqual(errors,[]);console.log('PASS shared C/D curve on actual GPU, EV range, existing TIFF owner and exact CPU sampling',JSON.stringify(results));
}finally{await h.close();}
