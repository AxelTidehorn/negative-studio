/* Optional integration check, not a photographic re-evaluation.
   node tools/check-v2-platform-raf.mjs PRIVATE_RAF PRIVATE_OUTPUT_JSON ARCHIVED_ANALYSIS
   Only loopback HTTP; never commits/uploads source pixels. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {ensureBuild} from './build-artifact.mjs';import {browserHarness} from '../tests/helpers/browser.mjs';
const [rawArg,outArg,analysisArg]=process.argv.slice(2);
if(!rawArg||!outArg||!analysisArg)throw Error('Usage: PRIVATE_RAF PRIVATE_OUTPUT_JSON ARCHIVED_ANALYSIS');
const output=path.resolve(outArg),repo=path.resolve('.');if(output.startsWith(repo+path.sep))throw Error('Keep private results outside repository');
const archived=JSON.parse(fs.readFileSync(analysisArg));ensureBuild();const h=await browserHarness();
try{
 const page=await h.browser.newPage({viewport:{width:1024,height:1000},hasTouch:true}),errors=[];page.setDefaultTimeout(300000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(h.url);await page.locator('#imageFile').setInputFiles(path.resolve(rawArg));await page.waitForFunction(()=>working&&!rollLoading);
 await page.locator('#engineMode').selectOption('v2');await page.waitForFunction(()=>state.engine==='v2'&&!!state.v2Recipe&&!rollLoading);
 const result=await page.evaluate(({region})=>{
  state.filmBaseVersion=2;setProposal2(FM2.measure(working,region));FILMLABB_BASE2.accept();
  if(state.v2Recipe.base.origin!=='measured')throw Error('MANUAL_BASE_NOT_ACCEPTED');
  const V=NSConversionV2,R=NSV2Render,r=state.v2Recipe,k=V.compile(r.source,r.base,r.calibration),independent=R.analyze(working,k,{analysisArea:v2Area()}),config=configuration38();
  const neutral=NSPixelKernel.compile({...config,opts:{...config.opts,...NSEditing2.neutral},profile:{type:'color'},print:{contrast:1,shoulder:0},neutralProfile:true,neutralPrint:true,strength:0});
  let maxError=0,samples=0;for(let y=0;y<12;y++)for(let x=0;x<16;x++){
   const sx=Math.floor((x+.5)*working.width/16),sy=Math.floor((y+.5)*working.height/12),p=NSV2Platform.read(working,(sy*working.width+sx)*3),a=neutral.pixel(p),b=R.view(k.pixel(p).positive,r.intent).map(R.encode);
   for(let c=0;c<3;c++)maxError=Math.max(maxError,Math.abs(a[c]-b[c]));samples++;
  }
  const before=JSON.stringify(r);state.exposure=.3;render();state.rotation=90;render();const invariant=JSON.stringify(state.v2Recipe)===before;
  state.rotation=0;state.exposure=0;render();
  return {schema:'filmlabb.v2-platform-raf-check',version:1,source:{width:working.width,height:working.height,bytes:working.data.byteLength,colorSpace:working.colorSpace,encoding:working.encoding},base:r.base.rgb,calibration:r.calibration.id,exposureEV:r.intent.exposure,analysisArea:r.intent.analysis.area,toneDifference:Math.abs(independent.exposure-r.intent.exposure),colorDifference:Math.max(...independent.colorCorrection.gains.flatMap((g,b)=>g.map((v,c)=>Math.abs(v-r.intent.colorCorrection.gains[b][c])))),referencePixelSamples:samples,maxAbsolutePixelError:maxError,creativeRecipeInvariant:invariant,previewBytes:NSPixelKernel.v2PreviewMetrics().bytes,exportGeometry:{width:exportGeometrySnapshot(working,state).g.width,height:exportGeometrySnapshot(working,state).g.height}};
 },{region:archived.measurement.region});
 assert.ok(result.maxAbsolutePixelError<2e-14);assert.equal(result.toneDifference,0);assert.equal(result.colorDifference,0);assert.equal(result.creativeRecipeInvariant,true);
 const download=page.waitForEvent('download');await page.locator('#exportTiff').click();const file=await download,tiff=output.replace(/\.json$/,'')+'.tif';await file.saveAs(tiff);
 await import('../src/import/tiff-codec.js');const data=fs.readFileSync(tiff),decoded=NSTiff.decodeSync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));assert.equal(decoded.bits,16);assert.equal(decoded.icc.length,588);assert.equal(decoded.width,result.exportGeometry.width);assert.equal(decoded.height,result.exportGeometry.height);
 result.export={width:decoded.width,height:decoded.height,bits:decoded.bits,iccBytes:decoded.icc.length,bytes:data.length};assert.deepEqual(errors,[]);
 fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await h.close();}
