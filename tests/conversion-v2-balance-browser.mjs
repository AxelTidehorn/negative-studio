import assert from 'node:assert/strict';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{const page=await h.browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url+'v2.html');await page.addScriptTag({url:h.url+'tiff-codec.js'});
 const result=await page.evaluate(async()=>{
  const V=NSConversionV2,R=NSV2Render,O=NSV2Output,width=80,height=80,rgb=[.8,.4,.2],im={width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(width*height*3)};
  for(let index=0;index<width*height;index++){const x=index%width,y=.01+((index*37)%(width*height))/(width*height)*.9,p=index%5<3?[2**-.2,1,2**.5]:index%2?[1.8,.6,.25]:[.25,1.2,.4],norm=y/V.luminance(p);im.data.set(x<3?rgb:p.map((v,c)=>rgb[c]*10**-(1+.65*Math.log10(v*norm/.18))),index*3);}
  const s=V.source(im,{revision:'color-worker'}),capture=V.capture({session:'color',recipe:{decoder:'synthetic'}}),owner=new NSV2Client(),view={crop:{x:0,y:0,w:1,h:1},rotation:0,limit:80,comparison:'technical',viewMode:'auto'},area={region:{x:.05,y:0,w:.95,h:1},status:'estimated',method:'application-frame',confidence:.68};
  const check=(test,message)=>{if(!test)throw Error(message);};
  try{
   await owner.run('source',{image:im,source:s,capture,limit:80});await owner.run('measure',{regions:[{x:0,y:0,w:.025,h:1}]});let r=await owner.run('accept',{...view,analysisArea:area}),active=r.snapshot;
   check(active.intent.analysis.area.status==='estimated','automatic frame must remain estimated');check(active.intent.colorCorrection.kind==='neutral-anchor-bands','active automatic color balance missing');const count=active.metrics.toneAnalysisCount;
   const k=V.compile(s,active.base),expected=O.rows(im,O.geometry(im),0,height,(x,y)=>O.pixel(im,k,active.intent,x,y),16),exported=await owner.run('export',{...view,engine:'B',format:'tiff'}),decoded=NSTiff.decodeSync(await exported.blob.arrayBuffer());let maxError=0;decoded.data.forEach((v,i)=>maxError=Math.max(maxError,Math.abs(v-expected[i])));check(maxError<=1,'worker export differs from active color intent');
   const coloredIntent=active.intent.id;r=await owner.run('tone',{...view,analysisArea:area});check(r.snapshot.metrics.toneAnalysisCount===count&&r.snapshot.intent.id===coloredIntent,'same color inputs should reuse analysis');
   r=await owner.run('tone',{...view,colorMode:'identity'});check(r.snapshot.intent.colorCorrection.kind==='identity','explicit identity');check(r.snapshot.metrics.toneAnalysisCount===count+1,'color mode invalidation');
   r=await owner.run('pair',{...view,viewMode:'fixed'});const fixedWithoutColor=Array.from(r.b);r=await owner.run('tone',{...view,viewMode:'fixed',colorMode:'auto'});check(JSON.stringify(Array.from(r.b))===JSON.stringify(fixedWithoutColor),'fixed changed with color balance');
   const original=r.snapshot,base=original.base;r=await owner.run('reuse',{...view,base:{...base,id:'color-base-changed',rgb:base.rgb.map((v,c)=>v*(c===2?1.1:1))}});check(r.snapshot.intent.id!==original.intent.id,'base change retained photographic intent');check(r.snapshot.intent.analysis.baseId===r.snapshot.base.id,'stale color/base analysis');
   r=await owner.run('undo',view);check(JSON.stringify(r.snapshot.intent.colorCorrection)===JSON.stringify(original.intent.colorCorrection),'undo color is not reproducible');check(r.snapshot.calibration.id===original.calibration.id,'color changed technical response');
   const report=(await owner.run('diagnostic',view)).report;check(report.colorBalance.value.kind==='neutral-anchor-bands'&&report.statistics.balanced,'missing color diagnostics');
   return {maxRGB16Error:maxError,color:report.colorBalance.value.kind,area:report.tonePlacement.value.area.status};
  }finally{owner.close();}
 });assert.deepEqual(errors,[]);console.log('PASS worker color intent, automatic estimated frame, mode/base invalidation and undo, unchanged-value reuse, fixed identity and RGB16 export oracle',JSON.stringify(result));
}finally{await h.close();}
