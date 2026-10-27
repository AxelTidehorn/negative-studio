import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const app=await browserHarness();
try{
 const page=await app.browser.newPage({viewport:{width:1360,height:950},serviceWorkers:'block',locale:'sv-SE'});await page.goto(app.url);
 await page.locator('#imageFile').setInputFiles('demo-negative.png');await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().draws>0);
 await page.locator('#base2Panel').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await page.locator('#base2Region').click();
 await page.evaluate(()=>{const width=3000,height=2000,data=new Float32Array(width*height*3);for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<3;c++)data[(y*width+x)*3+c]=[.8,.5,.25][c]*(.6+.3*x/width+.1*y/height);working={width,height,data,encoding:'linear',channels:3,scale:1};});
 const point=await page.evaluate(()=>{const b=$('picture').getBoundingClientRect(),p=FILMLABB_GEOMETRY.sourceToView({x:working.width*.2,y:working.height*.2});return {x:b.left+p.x,y:b.top+p.y};});
 await page.mouse.move(point.x,point.y);await page.mouse.down();
 const report=await page.evaluate(async({x,y})=>{
  const times=[],dispatchTimes=[],measureTimes=[],loupeTimes=[];let reads=0,measureCalls=0,loupeCalls=0;
  const pixel=CE.pixel,measure=FM2.measure,loupe=loupe2;CE.pixel=function(...args){reads++;return pixel(...args);};FM2.measure=function(...args){const t=performance.now();try{return measure(...args);}finally{measureTimes.push(performance.now()-t);measureCalls++;}};loupe2=function(...args){const t=performance.now();try{return loupe(...args);}finally{loupeTimes.push(performance.now()-t);loupeCalls++;}};
  try{
   for(let frame=0;frame<12;frame++){const t=performance.now();for(let i=0;i<8;i++)$('picture').dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:x+30+frame*3+i,clientY:y+30+frame*2+i,bubbles:true}));dispatchTimes.push(performance.now()-t);await new Promise(requestAnimationFrame);times.push(performance.now()-t);}
   // The pointerup must flush the LAST coordinates, rather than a pending preview region.
   $('picture').dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:x+70,clientY:y+60,bubbles:true}));await new Promise(requestAnimationFrame);
   const region={...baseRegion2},expected=measure(working,region),actual=proposal2.measurement,release=imagePoint({clientX:x+70,clientY:y+60});
   const releaseMatches=Math.abs(region.x+region.w-release.x)<1e-10&&Math.abs(region.y+region.h-release.y)<1e-10;
   const samplePoint={x:.5,y:.5};loupeSource2=null;loupe2(samplePoint);const loupePixel=$('base2Loupe').getContext('2d').getImageData(0,0,1,1).data,reference=CE.pixel(working,Math.floor(working.width/2)-7,Math.floor(working.height/2)-7).map(v=>Math.round(CE.encode(v)*255));
   const loupeMatches=reference.every((v,k)=>Math.abs(v-loupePixel[k])<=1);
   const quant=(a,q)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*q)]||0;
   return {environment:navigator.userAgent,source:{width:working.width,height:working.height,encoding:working.encoding},events:96,releaseMatches,loupeMatches,finalProvisional:!!actual.provisional,measureCalls,loupeCalls,sourceReads:reads,dispatchMedianMs:quant(dispatchTimes,.5),dispatchP95Ms:quant(dispatchTimes,.95),frameMedianMs:quant(times,.5),frameP95Ms:quant(times,.95),measureMedianMs:quant(measureTimes,.5),measureP95Ms:quant(measureTimes,.95),loupeMedianMs:quant(loupeTimes,.5),loupeP95Ms:quant(loupeTimes,.95),finalMatches:JSON.stringify(actual.measured)===JSON.stringify(expected.measured)&&actual.samples===expected.samples&&JSON.stringify(actual.region)===JSON.stringify(expected.region)};
  }finally{CE.pixel=pixel;FM2.measure=measure;loupe2=loupe;}
 },point);await page.mouse.up();
 const output=process.env.FILMLABB_BASE2_PERF_OUTPUT||'/tmp/filmlabb-base2-drag-performance.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.ok(report.finalMatches,'Released rectangle must have final robust source statistics');
 if(!process.env.FILMLABB_BASE2_PERF_BASELINE){assert.ok(report.releaseMatches,'Pointerup coordinates must update the final source rectangle');assert.ok(report.loupeMatches,'Optimized loupe must show the original negative source pixels');assert.equal(report.finalProvisional,false);assert.ok(report.loupeCalls<=15,'Coalesce pointer bursts to one loupe update per animation frame');assert.ok(report.measureCalls<=15,'Coalesce source statistics to one per animation frame plus final flush');assert.ok(report.loupeP95Ms<20,'Bounded loupe CPU cost in this Chromium environment');}
 await page.close();
}finally{await app.close();}
