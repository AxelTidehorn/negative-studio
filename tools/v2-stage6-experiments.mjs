/* Private, bounded experiments over the existing RAF quality caches.
   Uses the production core/render/diagnostic/output owners; never imported by UI.
   node tools/v2-stage6-experiments.mjs CACHE1,CACHE2 PRIVATE_OUTPUT [CASES] [--diagnostic-only]
   Caches: v2-response-validate.mjs --cache-only (or matching prior quality caches). */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
for(const n of ['conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/output','conversion-v2/diagnostics','editing/editing-engine'])await import('../src/'+n+'.js');
const V=NSConversionV2,R=NSV2Render,F=NSV2Fast,O=NSV2Output;
const [rootArg,outArg,...args]=process.argv.slice(2),caseArg=args.find(x=>!x.startsWith('--'))||'00,01,02,03,04,05,06,08,09,10,11',options=args.filter(x=>x.startsWith('--'));
if(!rootArg||!outArg||options.some(x=>x!=='--diagnostic-only'))throw Error('Usage: CACHE1,CACHE2 PRIVATE_OUTPUT [CASES] [--diagnostic-only]');
const roots=rootArg.split(',').map(x=>fs.realpathSync(x)),out=path.resolve(outArg),repo=fs.realpathSync('.');fs.mkdirSync(out,{recursive:true});
if(fs.realpathSync(out)===repo||fs.realpathSync(out).startsWith(repo+path.sep))throw Error('Private output must be outside the repository');
const Q=[.01,.05,.5,.6,.9,.95,.99],WS=[.2126,.7152,.0722],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),toSRGB=p=>R.matrix.map(row=>dot(row,p));
const quantiles=a=>{a.sort((a,b)=>a-b);return Q.map(q=>a[Math.floor((a.length-1)*q)]??null);};
const relativeChroma=p=>{const y=dot(WS,p);return y>1e-12?Math.hypot(...p.map(v=>v-y))/y:null;};
function difference(a,b){if(a===b)return 0;if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b);if(a&&b&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(Object.keys(a))===JSON.stringify(Object.keys(b)))return Math.max(0,...Object.keys(a).map(k=>difference(a[k],b[k])));return Infinity;}
function collector(color=true){const channels=[[],[],[]],Y=[],C=[],relative=[],rg=[],bg=[];let negatives=0,aboveOne=0,invalid=0;return {
 add(p,domain='rec2020'){if(!p.every(Number.isFinite)){invalid++;return;}p.forEach((v,c)=>channels[c].push(v));negatives+=p.some(v=>v<0);aboveOne+=p.some(v=>v>1);
  if(color){const y=dot(domain==='srgb'?WS:V.weights,p),q=domain==='srgb'?p:toSRGB(p);Y.push(y);const lab=NSEditing2.lab(q);C.push(Math.hypot(lab[1],lab[2]));const c=relativeChroma(q);if(c!==null)relative.push(c);if(p[0]>0&&p[1]>0)rg.push(Math.log2(p[0]/p[1]));if(p[2]>0&&p[1]>0)bg.push(Math.log2(p[2]/p[1]));}
 },finish(){return {samples:channels[0].length,quantiles:Q,channels:channels.map(quantiles),luminance:color?quantiles(Y):null,OKLabChroma:color?quantiles(C):null,relativeLinearSRGBChroma:color?quantiles(relative):null,log2RG:color?quantiles(rg):null,log2BG:color?quantiles(bg):null,negativePixels:negatives,aboveOnePixels:aboveOne,invalid};}};}
function diagnostic(grid,k,intent,mask){
 const names=['source','density','positive','balanced','exposed','toned','preGamut','output'],stages=Object.fromEntries(names.map(n=>[n,collector(n!=='density')])),counts={samples:0,sourceInvalid:0,sourceLogFloor:0,sourceEndpointClipped:0,modelBounded:0,reconstructedNonPositive:[0,0,0],gamutOutside:0,gamutChangedInside:0,chromaReduced20:0},slopes=[[],[],[]],retention=[];
 let maxToneRatioChangeEV=0;
 for(let n=0;n<mask.data.length;n++)if(mask.data[n]){
  const j=V.read(grid,n*3),p=k.pixel(j),b=R.balance(p.positive,intent),e=b.map(v=>v*2**intent.exposure),t=R.toneOnly(b,intent),pre=toSRGB(t),output=R.output(t,intent);counts.samples++;
  counts.sourceInvalid+=p.flags.invalid.some(Boolean);counts.sourceLogFloor+=p.flags.floor.some(Boolean);counts.sourceEndpointClipped+=p.flags.clipped.some(Boolean);counts.modelBounded+=p.flags.bounded.some(Boolean);
  k.calibration.densityMatrix.forEach((row,c)=>{const q=dot(row,p.density);counts.reconstructedNonPositive[c]+=q<=0;if(q>0)slopes[c].push(k.calibration.responses[c].slope/(-Math.expm1(-Math.LN10*k.calibration.responses[c].slope*q)));});
  for(const [name,value]of Object.entries({source:j,density:p.density,positive:p.positive,balanced:b,exposed:e,toned:t,preGamut:pre,output}))stages[name].add(value,['preGamut','output'].includes(name)?'srgb':'rec2020');
  const inside=pre.every(v=>v>=0&&v<=1);counts.gamutOutside+=!inside;counts.gamutChangedInside+=inside&&pre.some((v,c)=>Math.abs(v-output[c])>1e-9);
  const cp=relativeChroma(pre),co=relativeChroma(output);if(cp>.01&&co!==null){retention.push(co/cp);counts.chromaReduced20+=co<cp*.8;}
  for(const c of [0,2])if(b[c]>0&&b[1]>0&&t[c]>0&&t[1]>0)maxToneRatioChangeEV=Math.max(maxToneRatioChangeEV,Math.abs(Math.log2(t[c]/t[1])-Math.log2(b[c]/b[1])));
 }
 return {basis:'same source-anchored production content mask; stage percentiles are bounded sample estimates, not full-image census or color ground truth',counts,stages:Object.fromEntries(Object.entries(stages).map(([name,s])=>[name,s.finish()])),responseRelativeSlopePerDensity:slopes.map(quantiles),gamutRelativeChromaRetention:quantiles(retention),maxToneRatioChangeEV};
}
function load(root,c,name,meta){const b=fs.readFileSync(path.join(root,c+'_'+name+'.f32'));if(b.length!==meta.width*meta.height*12)throw Error('CACHE_SIZE_MISMATCH');return {...meta,data:new Float32Array(b.buffer,b.byteOffset,b.byteLength/4)};}
const results=[];
const models=options.includes('--diagnostic-only')?null:await import('./v2-stage6-models.mjs');
const experimentModelSHA256=models?createHash('sha256').update(fs.readFileSync(new URL('./v2-stage6-models.mjs',import.meta.url))).digest('hex'):null;
let freezeSHA256=null;
const productionFiles=['src/conversion-v2/core.js','src/conversion-v2/render.js','src/conversion-v2/fast.js','src/conversion-v2/output.js','src/conversion-v2/diagnostics.js','src/conversion-v2/base.js','src/conversion-v2/platform.js','src/import/raw-input.js','src/import/raw-decoder.js','src/calibration/film-base-measurement.js','src/image/image-model.js','src/editing/editing-engine.js'];
function productionFingerprint(ref){const h=createHash('sha256');for(const file of productionFiles)h.update(file+'\n').update(ref?execFileSync('git',['show',ref+':'+file]):fs.readFileSync(file));return h.digest('hex');}
if(models){const file=path.join(out,'experiment-freeze.json'),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),frozen={baseCommit:commit,parameters:models.parameters,experimentModelSHA256};
 if(fs.existsSync(file)){const previous=JSON.parse(fs.readFileSync(file));if(JSON.stringify(previous.parameters)!==JSON.stringify(frozen.parameters)||productionFingerprint(previous.baseCommit)!==productionFingerprint()||previous.experimentModelSHA256&&previous.experimentModelSHA256!==experimentModelSHA256)throw Error('FROZEN_EXPERIMENT_CHANGED');}
 else fs.writeFileSync(file,JSON.stringify({...frozen,createdAt:new Date().toISOString(),sampling:'bounded source-center overview; native 512px artifacts; no grain/resolution conclusions from overview'},null,2));freezeSHA256=createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
async function image(file,im,sample){const g=O.geometry(im),rgba=await O.area(im,g,sample),rgb=Buffer.alloc(im.width*im.height*3);for(let i=0;i<rgb.length;i++)rgb[i]=rgba[Math.floor(i/3)*4+i%3];fs.writeFileSync(file,Buffer.concat([Buffer.from(`P6\n${im.width} ${im.height}\n255\n`),rgb]));}
for(const c of caseArg.split(',')){
 if(!/^\d\d$/.test(c))throw Error('CASE_INVALID');const root=roots.find(x=>fs.existsSync(path.join(x,c+'_source.json')));if(!root)throw Error('CACHE_MISSING: '+c);
 const m=JSON.parse(fs.readFileSync(path.join(root,c+'_source.json')));if(JSON.stringify(m.calibration)!==JSON.stringify(V.latestPrior))throw Error('CACHE_CALIBRATION_MISMATCH');
 const grid=load(root,c,'grid',m.grid),k=V.compile(m.source,m.base,m.calibration),a=R.analyzeWithMask(grid,k,{analysisArea:m.area,algorithmVersion:3});
 const cacheDifference=Math.max(difference(a.intent.exposure,m.intent.exposure),difference(a.intent.colorCorrection,m.intent.colorCorrection),difference(a.intent.analysis.counts,m.intent.analysis.counts));if(cacheDifference>1e-12)throw Error('CACHE_ANALYSIS_MISMATCH: '+c+' max difference '+cacheDifference);
 const photo1=R.photographic(a.intent),photo2=R.photographic(a.intent,2),record={case:c,sourceSHA256:m.sourceSha256,cacheAnalysisMaxAbsDifference:cacheDifference,source:{width:m.source.width,height:m.source.height,domain:'linear-rec2020',transfer:'linear'},area:a.intent.analysis.area,crop:m.crop,analysis:a.intent.analysis,exposure:photo2.analysis.exposure,colorBalance:R.prepareBalance(photo2)||photo2.colorCorrection,diagnostic:diagnostic(grid,k,photo2,a.mask)};
 fs.writeFileSync(path.join(out,c+'_production_diagnostic.json'),JSON.stringify(NSV2Diagnostics.diagnostic(grid,k,photo2,{mask:a.mask}),null,2));
 if(models){
  const ys=record.diagnostic.stages.positive.luminance,statistics={p50:ys[2],p60:ys[3],p95:ys[5],p99:ys[6],samples:a.intent.sampleCount,validFraction:a.intent.sampleCount/(a.mask.data.length-a.intent.analysis.counts.outsideArea),areaStatus:a.intent.analysis.area.status,areaConfidence:a.intent.analysis.area.confidence},overview=load(root,c,'overview',m.overview),reference=F.compile(k,photo2),referencePixel=new Float64Array(3),q=new Float64Array(3),technical=new Float64Array(3);
  record.variants={};
  for(const name of ['photo1','photo2','H1','H2','H3']){
   const f=models.compile(name,k,photo2,statistics),all=collector(),bands=[collector(),collector(),collector()],hue=[],chromaRatio=[],lumaDelta=[];let endpoints=0;
   for(let n=0;n<a.mask.data.length;n++)if(a.mask.data[n]){const j=V.read(grid,n*3);f.pixel(...j,q);reference.pixel(...j,referencePixel);reference.technical(...j,technical);const y=V.luminance(technical),band=y<ys[2]?0:y<ys[4]?1:2;all.add(Array.from(q),'srgb');bands[band].add(Array.from(q),'srgb');endpoints+=q.some(v=>v<=0||v>=1);lumaDelta.push(dot(WS,q)-dot(WS,referencePixel));
    const lab=NSEditing2.lab(Array.from(q)),ref=NSEditing2.lab(Array.from(referencePixel)),cp=Math.hypot(ref[1],ref[2]),cc=Math.hypot(lab[1],lab[2]);if(cp>.015&&cc>.015){const angle=Math.atan2(lab[2],lab[1])-Math.atan2(ref[2],ref[1]);hue.push(Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))*180/Math.PI);chromaRatio.push(cc/cp);}
   }
   const metric={recipe:f.metadata,output:all.finish(),bands:bands.map(b=>b.finish()),bandBasis:'same technical Y: below P50 / P50-P90 / above P90',hueDifferenceDegrees:quantiles(hue),OKLabChromaRatio:quantiles(chromaRatio),luminanceDifference:quantiles(lumaDelta),endpointPixels:endpoints,diagnosticCounters:{...f.stats}};
   await image(path.join(out,c+'_'+name+'.ppm'),overview,models.compile(name,k,photo2,statistics).pixel);
   const detail=load(root,c,'detail0',m.details[0]),native=models.compile(name,k,photo2,statistics);await image(path.join(out,c+'_'+name+'_native.ppm'),detail,native.pixel);
   if(c==='05'){const p=new Float64Array(3);let purple=0,blue=0;for(let i=0;i<detail.data.length;i+=3){native.pixel(detail.data[i],detail.data[i+1],detail.data[i+2],p);const y=dot(WS,p);blue+=y>.4&&p[2]>.4&&p[2]-p[1]>.015;purple+=y>.4&&p[0]-p[1]>.015&&p[2]-p[1]>.015;}metric.windowDiagnosticSelection={basis:'same retained 512px native window; diagnostic threshold, not error-pixel ground truth',blue,purple};}
   record.variants[name]=metric;
  }
 }
 results.push(record);console.log(c,JSON.stringify({exposure:photo2.exposure,fallback:photo2.analysis.exposure.fallback,counts:record.diagnostic.counts,gamutChromaRetention:record.diagnostic.gamutRelativeChromaRetention,ratioChange:record.diagnostic.maxToneRatioChangeEV}));
}
fs.writeFileSync(path.join(out,models?'stage6-results.json':'stage6-diagnostic.json'),JSON.stringify({schema:models?'filmlabb.stage6-experiments':'filmlabb.stage6-diagnostic',version:1,baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),freezeSHA256,productionSHA256:productionFingerprint(),experimentModelSHA256,productionCodeChanged:false,cases:results},null,2));
