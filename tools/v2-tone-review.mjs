/* Private A/B runner over the real main-platform RAW and TIFF owners.
   Production files must match the supplied frozen git baseline byte for byte.
   No source pixels are written, no upload, no fitting and no app integration.
   node tools/v2-tone-review.mjs BASELINE PACKAGE ORIGINALS CACHES OUTPUT CASES
   CACHES is a comma-separated list; OUTPUT must be outside the repository. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import {browserHarness,selectEngine} from '../tests/helpers/browser.mjs';import {ensureBuild} from './build-artifact.mjs';
import {parameters,propose} from './v2-scene-tone-model.mjs';
const [baseline,pack,originals,caches,output,cases='04,05,09,00,06,08,11',flag,previousOutput]=process.argv.slice(2);
const presentation=flag==='--presentation';if(flag&&!presentation||presentation&&!previousOutput)throw Error('Use --presentation PREVIOUS_OUTPUT');
const presentationModel=presentation?await import('./v2-presentation-model.mjs'):null;
if(!/^[a-f0-9]{40}$/.test(baseline||'')||!output)throw Error('BASELINE PACKAGE ORIGINALS CACHES OUTPUT CASES required');
const repo=fs.realpathSync('.'),out=path.resolve(output);fs.mkdirSync(out,{recursive:true});if(fs.realpathSync(out).startsWith(repo+path.sep)||fs.realpathSync(out)===repo)throw Error('Private output must remain outside repository');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'src','app-manifest.mjs','index.html'],{encoding:'utf8'}).trim().split('\n'),owners={};
for(const f of files){const bytes=execFileSync('git',['show',baseline+':'+f],{maxBuffer:10000000});if(!fs.readFileSync(f).equals(bytes))throw Error('BASELINE_OWNER_CHANGED: '+f);owners[f]=sha(bytes);}
const freeze={schema:'filmlabb.scene-tone-review-freeze',version:1,baseline,owners,parameters,modelSHA256:sha(fs.readFileSync('tools/v2-scene-tone-model.mjs')),development:['04','05','09'],controls:['00','01','02','03','06','08','10','11'],...(presentation?{presentation:{parameters:presentationModel.parameters,modelSHA256:sha(fs.readFileSync('tools/v2-presentation-model.mjs')),exposureCommit:'912430a762f28c7b7e316cdc71056f35c87dbba1',development:['09','05','11'],controls:['00','01','02','03','04','06','08','10']}}:{}),caveat:'Historically seen RAFs, not an unseen dataset. No controlled low-key or night series.'};
const frozen=path.join(out,'freeze.json');if(fs.existsSync(frozen)&&JSON.stringify(JSON.parse(fs.readFileSync(frozen)))!==JSON.stringify(freeze))throw Error('FROZEN_REVIEW_CHANGED');fs.writeFileSync(frozen,JSON.stringify(freeze,null,2));
const inventory=JSON.parse(fs.readFileSync(path.join(pack,'results/inventory.json'))),roots=caches.split(',');
ensureBuild();const h=await browserHarness();
try{for(const id of cases.split(',')){
 if(!/^\d\d$/.test(id)||!inventory[+id])throw Error('CASE_INVALID');
 const dir=roots.find(r=>fs.existsSync(path.join(r,id+'_source.json')));if(!dir)throw Error('CACHE_MISSING '+id);
 const m=JSON.parse(fs.readFileSync(path.join(dir,id+'_source.json'))),raw=path.resolve(originals,inventory[+id].id+'.RAF'),hash=sha(fs.readFileSync(raw));if(hash!==m.sourceSha256||hash!==inventory[+id].sha256)throw Error('SOURCE_HASH_MISMATCH '+id);
 const recordPath=path.join(out,id+'_record.json');if(fs.existsSync(recordPath)){console.log('SKIP COMPLETE',id);continue;}
 const context=await h.browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(600000);
 console.log('DECODE',id);await page.goto(h.url);if(presentation)await page.addScriptTag({content:'(function(){'+fs.readFileSync('tools/v2-presentation-model.mjs','utf8').replace(/^export /gm,'')+';globalThis.PresentationReview={install,parameters};})();'});await page.locator('#imageFile').setInputFiles(raw);await page.waitForFunction(()=>working&&!rollLoading);await selectEngine(page,'v2');
 const record=await page.evaluate(({m,model})=>{
  const V=NSConversionV2,R=NSV2Render,k=V.compile(m.source,m.base,m.calibration),analyzed=R.analyzeWithMask(working,k,{analysisArea:m.area,algorithmVersion:3,photographic:2,output:R.presentationRecipe.version});
  if(working.width!==m.source.width||working.height!==m.source.height||JSON.stringify(sourceInfo.rawMetadata.options)!==JSON.stringify(m.source.recipe.options))throw Error('DECODE_RECIPE_MISMATCH');
  const difference=(a,b)=>a===b?0:typeof a==='number'&&typeof b==='number'?Math.abs(a-b):a&&b&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(Object.keys(a))===JSON.stringify(Object.keys(b))?Math.max(0,...Object.keys(a).map(k=>difference(a[k],b[k]))):Infinity;
  const archiveDifference=Math.max(Math.abs(analyzed.intent.exposure-m.intent.exposure),difference(analyzed.intent.colorCorrection,m.intent.colorCorrection));if(archiveDifference>1e-12)throw Error('ARCHIVED_ANALYSIS_MISMATCH '+archiveDifference);
  const ys=[];for(let i=0;i<analyzed.mask.data.length;i++)if(analyzed.mask.data[i]){const x=i%analyzed.mask.cols,y=Math.floor(i/analyzed.mask.cols),sx=Math.floor((x+.5)*working.width/analyzed.mask.cols),sy=Math.floor((y+.5)*working.height/analyzed.mask.rows);ys.push(V.luminance(k.pixel(V.read(working,(sy*working.width+sx)*3)).positive));}
  const statistics={p10:R.quantile(ys,.1),p50:R.quantile(ys,.5),p60:R.quantile(ys,.6),p90:R.quantile(ys,.9),p99:R.quantile(ys,.99),samples:ys.length,validFraction:ys.length/(analyzed.mask.data.length-analyzed.intent.analysis.counts.outsideArea),areaStatus:analyzed.intent.analysis.area.status,areaConfidence:analyzed.intent.analysis.area.confidence};
  Object.assign(state,NSEditing2.neutral,{editVersion:2,rotation:0,exposure:0});rollShared.cropExportToFrame=false;state.cropExport=false;
  const before={...state.v2Recipe,source:m.source,base:m.base,calibration:m.calibration,intent:analyzed.intent,analysisSignature:R.analysisKey(k,{analysisArea:m.area,algorithmVersion:3,photographic:2,output:R.presentationRecipe.version})};
  const config=configuration38();config.v2=before;config.opts={...config.opts,...NSEditing2.neutral,editVersion:2};config.look={id:'neutral',strength:0};config.monochrome=false;
  // Only the test page is pinned. The real export owner and pixel kernel are
  // unchanged; no proposal can be saved into a user's project or default.
  globalThis.toneReview={before,statistics,config,analyzed};configuration38=()=>toneReview.config;
  return {archiveDifference,source:m.source,base:m.base,calibration:m.calibration,analysisArea:m.area,filmCrop:m.crop,statistics,before:analyzed.intent,settings:{...config, v2:undefined},details:m.details,dimensions:[working.width,working.height],exportGeometry:{width:exportGeometrySnapshot(working,state).g.width,height:exportGeometrySnapshot(working,state).g.height},model};
 },{m,model:parameters});
 // Call the same frozen production formula used by the page, with no render
 // approximation in Node. The model's only output consumed by pixels is EV.
 for(const f of ['core','render'])await import('../src/conversion-v2/'+f+'.js');
 const candidate=propose(NSV2Render,record.before,record.statistics);record.after=candidate.intent;record.candidateAnalysis=candidate.analysis;
 if(presentation){const saved=JSON.parse(fs.readFileSync(path.join(previousOutput,id+'_record.json')));if(saved.raw.sha256!==hash||Math.abs(saved.after.exposure-candidate.intent.exposure)>1e-12)throw Error('EXPOSURE_BASELINE_CHANGED');record.before=saved.before;record.after=saved.after;record.reusedAB={archive:path.resolve(previousOutput,'FILMLABB_V2_TONE_REVIEW_image'+id+'.zip'),variants:saved.exportMeasurements};record.presentation=presentationModel.parameters;record.variants={A:saved.before,B:saved.after,C:{...saved.after,id:saved.after.id+'-C'},D:{...saved.after,id:saved.after.id+'-D'}};}
 for(const [name,intent] of (presentation?[['C',record.variants.C],['D',record.variants.D]]:[['before',record.before],['after',record.after]])){
  await page.evaluate(({intent,name,presentation})=>{if(presentation){toneReview.restore?.();toneReview.restore=PresentationReview.install(NSV2Render,name);}toneReview.config.v2={...toneReview.before,intent};state.v2Recipe=toneReview.config.v2;config38=null;},{intent,name,presentation});
  await page.locator('#exportFormat').selectOption('tiff');const pending=page.waitForEvent('download');await page.locator('#export').click();const file=await pending;await file.saveAs(path.join(out,id+'_'+name+'.tiff'));await page.waitForFunction(()=>!exportBusy);
  console.log('TIFF',id,name,fs.statSync(path.join(out,id+'_'+name+'.tiff')).size);
  if(presentation&&process.env.FILMLABB_REVIEW_PACKAGER)execFileSync('python3',[process.env.FILMLABB_REVIEW_PACKAGER,out,id,'stage',name],{stdio:'inherit'});
 }
 record.errors=errors;if(errors.length)throw Error('BROWSER_ERRORS '+errors.join(';'));
 record.raw={id:inventory[+id].id,sha256:hash,bytes:fs.statSync(raw).size};record.baseline=baseline;record.candidate=parameters.version;record.productionChanged=false;record.freezeSHA256=sha(fs.readFileSync(frozen));
 fs.writeFileSync(recordPath,JSON.stringify(record,null,2));await context.close();
 // Optional external packager keeps only per-image ZIPs on small workspaces.
 // It must not adjust render parameters. Arguments are passed without a shell.
 if(process.env.FILMLABB_REVIEW_PACKAGER)execFileSync('python3',[process.env.FILMLABB_REVIEW_PACKAGER,out,id],{stdio:'inherit',maxBuffer:1000000});
}}finally{await h.close();}
