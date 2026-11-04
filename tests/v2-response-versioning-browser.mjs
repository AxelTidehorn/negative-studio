import assert from 'node:assert/strict';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{const page=await h.browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url+'v2.html');await page.addScriptTag({url:h.url+'tiff-codec.js'});
 const result=await page.evaluate(async()=>{
  const V=NSConversionV2,R=NSV2Render,O=NSV2Output,width=80,height=60,rgb=[.8,.4,.2],im={width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(width*height*3)};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)im.data.set(x<6?rgb:rgb.map((v,c)=>v*10**-(.25+1.2*x/width+c*.04)),(y*width+x)*3);
  const s=V.source(im,{revision:'response-worker'}),capture=V.capture({session:'test',recipe:{decoder:'fixture'}}),owner=new NSV2Client(),view={crop:{x:0,y:0,w:1,h:1},rotation:0,limit:80,comparison:'technical',viewMode:'auto'},area={region:{x:.1,y:0,w:.9,h:1},status:'confirmed'},check=(ok,message)=>{if(!ok)throw Error(message);};
  let maxError=0;try{
   let r=await owner.run('source',{image:im,source:s,capture,limit:80});check(r.snapshot.calibration.id===V.latestPrior.id&&r.snapshot.algorithmVersion===3,'new worker default');
   await owner.run('measure',{regions:[{x:0,y:0,w:.05,h:1}]});r=await owner.run('accept',{...view,analysisArea:area});const newer=r.snapshot,base=newer.base;
   check(newer.calibration.version===3&&newer.intent.analysisVersion==='robust-p60-highlight-2','new calibration/tone identity');
   for(const [calibration,algorithmVersion] of [[V.prior,1],[V.latestPrior,2],[V.latestPrior,3]]){
    r=await owner.run('calibration',{...view,calibration,algorithmVersion});const active=r.snapshot,k=V.compile(s,active.base,calibration),expected=O.rows(im,O.geometry(im),0,height,(x,y)=>O.pixel(im,k,active.intent,x,y),16),exported=await owner.run('export',{...view,engine:'B',format:'tiff'}),decoded=NSTiff.decodeSync(await exported.blob.arrayBuffer());
    decoded.data.forEach((v,i)=>maxError=Math.max(maxError,Math.abs(v-expected[i])));check(maxError<=1,'worker/export must use selected technical response');check(active.source.revision===s.revision&&JSON.stringify(active.base.rgb)===JSON.stringify(base.rgb),'profile comparison must not decode or remeasure base');
    check(active.algorithmVersion===algorithmVersion,'stale rendering algorithm');check(active.intent.calibrationId===calibration.id,'stale calibration intent');check(active.intent.analysisVersion===(calibration.version===3?'robust-p60-highlight-2':'robust-p60-highlight-1'),'stale tone version');
    const before=JSON.stringify(active.calibration);r=await owner.run('reuse',{...view,base:{...base,id:'changed-'+calibration.id,rgb:base.rgb.map(v=>v*1.05)}});check(JSON.stringify(r.snapshot.calibration)===before,'base edit changed response');r=await owner.run('undo',view);check(JSON.stringify(r.snapshot.calibration)===before,'undo changed response');check(r.snapshot.algorithmVersion===algorithmVersion,'undo changed rendering algorithm');
   }
   r=await owner.run('algorithm',{...view,algorithmVersion:2});check(r.snapshot.algorithmVersion===2&&r.snapshot.intent.algorithmVersion===undefined,'explicit old rendering');r=await owner.run('algorithm',{...view,algorithmVersion:3});check(r.snapshot.algorithmVersion===3&&r.snapshot.intent.output==='luminance-gamut-2','explicit new rendering');
   const report=(await owner.run('diagnostic',view)).report;check(report.calibration.value.id===V.latestPrior.id,'diagnostic selected calibration');
   const explicit=new NSV2Client();try{r=await explicit.run('source',{image:im,source:s,capture,limit:80,calibration:V.prior});check(r.snapshot.calibration.id===V.prior.id,'explicit old source recipe');}finally{explicit.close();}
   return {maxRGB16Error:maxError,selected:report.calibration.value.id};
  }finally{owner.close();}
 });assert.deepEqual(errors,[]);console.log('PASS latest worker default, explicit old/current profile comparison on one owned source, frozen base/response, all3 RGB16 oracles and active diagnostics',JSON.stringify(result));
}finally{await h.close();}
