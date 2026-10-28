(function(root){
'use strict';
const V=root.NSConversionV2,quantile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)]??0;};
// Experimental E1 recipe, frozen before looking at validation images 09/10.
// The EV envelope is a numerical guard (16-bit signal range), not a +1 EV look.
const exposureRecipe=V.freeze({version:'robust-p60-highlight-1',target:.25,highlightCeiling:3,minSamples:16,minValidFraction:.05,maxAbsEV:16});
const fullRegion={x:0,y:0,w:1,h:1};
function areaDescriptor(area){
 const r=area?.region,valid=r&&['x','y','w','h'].every(c=>Number.isFinite(r[c]))&&r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=1.000001&&r.y+r.h<=1.000001;
 return {region:valid?{x:r.x,y:r.y,w:r.w,h:r.h}:{...fullRegion},status:valid&&area.status==='confirmed'?'confirmed':valid?'unconfirmed':area?'invalid':'missing',method:valid&&area.status==='confirmed'?'manual-frame':'unconfirmed-frame'};
}
function analysisKey(k,options={}){return JSON.stringify({version:exposureRecipe.version,source:k.source,base:{domain:k.base.domain,rgb:k.base.rgb,measured:k.base.origin!=='prior'},calibration:k.calibration,area:areaDescriptor(options.analysisArea),maskMode:options.maskMode==='all'?'all':'content'});}
// Public fingerprint is opaque; exact signatures stay private in the worker.
function fingerprint(text){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;return 'analysis-'+hash.toString(16);}
function exposureFromStatistics({p50,p60,p99,samples=0,validFraction=0,areaStatus='missing'}={}){
 let fallback=areaStatus!=='confirmed'?'ANALYSIS_AREA_UNCONFIRMED':!Number.isSafeInteger(samples)||!Number.isFinite(validFraction)||validFraction<0||validFraction>1?'INVALID_SAMPLE_STATISTICS':samples<exposureRecipe.minSamples||validFraction<exposureRecipe.minValidFraction?'INSUFFICIENT_VALID_SAMPLES':![p50,p60,p99].every(v=>Number.isFinite(v)&&v>0)||p99<p60||p60<p50?'INVALID_LUMINANCE_STATISTICS':null;
 const midEV=Number.isFinite(p60)&&p60>0?Math.log2(exposureRecipe.target)-Math.log2(p60):null,highlightEV=Number.isFinite(p99)&&p99>0?Math.log2(exposureRecipe.highlightCeiling)-Math.log2(p99):null;
 // Stable log-domain equivalent of e_mid / hypot(1,e_mid/e_hi).
 const delta=midEV-highlightEV,softEV=midEV===null||highlightEV===null?null:delta>0?highlightEV-.5*Math.log2(1+2**(-2*delta)):midEV-.5*Math.log2(1+2**(2*delta));
 if(!fallback&&(!Number.isFinite(softEV)||Math.abs(softEV)>exposureRecipe.maxAbsEV))fallback='EXPOSURE_OUTSIDE_NUMERICAL_ENVELOPE';
 return {recipe:exposureRecipe,percentiles:{p50:Number.isFinite(p50)?p50:null,p60:Number.isFinite(p60)?p60:null,p99:Number.isFinite(p99)?p99:null},requestedEV:midEV,highlightEV,softEV,appliedEV:fallback?0:softEV,highlightReductionEV:fallback?0:midEV-softEV,highlightLimited:!fallback&&midEV!==null&&softEV!==null&&midEV-softEV>1e-6,fallback};
}
// Content selection is source anchored and belongs only to RenderIntent.
// It does not modify BaseReference or CalibrationV2, and never reads crop/zoom.
function analyzeWithMask(im,k,options={}){
 const {maskMode='content'}=options,area=areaDescriptor(options.analysisArea),region=area.region,key=analysisKey(k,options);
 const cols=Math.min(160,im.width),rows=Math.min(im.height,Math.max(1,Math.floor(24000/cols))),n=cols*rows,luma=new Float64Array(n),kind=new Uint8Array(n),edge=new Uint8Array(n),mask=new Uint8Array(n),queue=new Uint32Array(n),knownBase=k.base.origin!=='prior';let head=0,tail=0;
 const counts={invalid:0,clipped:0,logFloor:0,edgeBase:0,edgeHolder:0,edgeClear:0,outsideArea:0,kept:0};
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const sx=Math.min(im.width-1,Math.floor((x+.5)*im.width/cols)),sy=Math.min(im.height-1,Math.floor((y+.5)*im.height/rows)),j=V.read(im,(sy*im.width+sx)*3),r=k.pixel(j),i=y*cols+x;luma[i]=V.luminance(r.positive);
  kind[i]=r.flags.invalid.some(Boolean)?1:r.flags.floor.some(Boolean)?3:r.flags.clipped.some(Boolean)?2:knownBase&&r.density.every(v=>Math.abs(v)<.06)?4:j.every(v=>v<.005)?5:j.every((v,c)=>v>.8&&v/k.base.rgb[c]>1.1)?6:0;
 }
 function add(i){if(!edge[i]&&kind[i]){edge[i]=1;queue[tail++]=i;}}
 for(let x=0;x<cols;x++){add(x);add((rows-1)*cols+x);}for(let y=0;y<rows;y++){add(y*cols);add(y*cols+cols-1);}
 while(head<tail){const i=queue[head++],x=i%cols,y=Math.floor(i/cols);if(x)add(i-1);if(x+1<cols)add(i+1);if(y)add(i-cols);if(y+1<rows)add(i+cols);}
 const values=[],all=[];let hash=2166136261;
 for(let i=0;i<n;i++){
  if(kind[i]!==1&&kind[i]!==3)all.push(luma[i]);
  const x=(i%cols+.5)/cols,y=(Math.floor(i/cols)+.5)/rows,outside=x<region.x||y<region.y||x>=region.x+region.w||y>=region.y+region.h;
  const excluded=outside||kind[i]===1||kind[i]===3||(maskMode!=='all'&&(kind[i]===2||edge[i]));mask[i]=excluded?0:1;
  if(mask[i]){values.push(luma[i]);counts.kept++;}
  else if(outside)counts.outsideArea++;else if(kind[i]===1)counts.invalid++;else if(kind[i]===3)counts.logFloor++;else if(kind[i]===2)counts.clipped++;else if(kind[i]===4)counts.edgeBase++;else if(kind[i]===5)counts.edgeHolder++;else if(kind[i]===6)counts.edgeClear++;
  hash=Math.imul(hash^mask[i],16777619)>>>0;
 }
 const median=quantile(values,.5),p60=quantile(values,.6),p99=quantile(values,.99),areaSamples=n-counts.outsideArea,exposureAnalysis=exposureFromStatistics({p50:median,p60,p99,samples:values.length,validFraction:values.length/Math.max(1,areaSamples),areaStatus:area.status}),ok=!exposureAnalysis.fallback,exposure=exposureAnalysis.appliedEV,requested=exposureAnalysis.requestedEV;

 const analysis={version:3,key:fingerprint(key),area,exposure:exposureAnalysis,mode:maskMode==='all'?'frame-source-grid-3':'frame-edge-connected-content-3',status:ok?'estimated':'insufficient',sourceRevision:k.source.revision,baseId:k.base.id,cols,rows,samples:n,counts,keptFraction:values.length/n,maskId:'mask-'+hash.toString(16),baseEvidence:knownBase?'measured':'prior',assumption:'Heuristic edge-connected base/holder/clear regions; not semantic subject detection',fullSourceMedian:quantile(all,.5),fullSourceRequestedEV:all.length?Math.log2(.18/Math.max(1e-30,quantile(all,.5))):null};
 const intent=V.freeze({schema:'RenderIntentV1',version:1,id:'tone-'+V.uuid(),analysisVersion:exposureRecipe.version,sourceRevision:k.source.revision,calibrationId:k.calibration.id,baseId:k.base.id,status:ok?'estimated':'prior',exposure,requestedExposure:requested,exposureLimited:exposureAnalysis.highlightLimited||!!exposureAnalysis.fallback,tone:'luminance-reinhard-1',colorCorrection:{version:1,status:'prior',kind:'identity'},sampleCount:values.length,median,analysis});
 return {intent,mask:{cols,rows,data:mask,sourceRevision:k.source.revision,intentId:intent.id}};
}
function analyze(im,k,options){return analyzeWithMask(im,k,options).intent;}
function render(p,intent){if(intent?.schema!=='RenderIntentV1'||intent.version!==1||intent.tone!=='luminance-reinhard-1'||!Number.isFinite(intent.exposure)||Math.abs(intent.exposure)>exposureRecipe.maxAbsEV)throw Error('RENDER_INTENT_INVALID');const e=2**intent.exposure,y=V.luminance(p)*e;return p.map(v=>v*e/(1+y));}
// Explicit output boundary: Rec.2020 -> linear sRGB, neutral-axis gamut compression,
// then peak shoulder. Technical headroom survives until here.
const matrix=[[1.6604910021084345,-.5876411387885495,-.0728498633198848],[-.1245504745215907,1.13289989712596,-.0083494226043694],[-.0181507633549052,-.1005788980080074,1.1187296613629127]];
function display(p){let q=matrix.map(r=>r.reduce((s,v,k)=>s+v*p[k],0)),y=Math.max(0,.2126*q[0]+.7152*q[1]+.0722*q[2]),min=Math.min(...q),s=min<0?y/Math.max(1e-30,y-min):1;q=q.map(v=>Math.max(0,y+(v-y)*s));const peak=Math.max(...q),target=peak<=.8?peak:.8+.2*(-Math.expm1(-(peak-.8)/.2));return q.map(v=>peak>0?v*target/peak:0);}
const encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
function view(p,intent,mode='auto'){if(mode==='technical')return display(p);if(mode==='fixed')return display(render(p,{...intent,exposure:0}));if(mode==='auto')return display(render(p,intent));throw Error('VIEW_MODE_INVALID');}
root.NSV2Render={exposureRecipe,exposureFromStatistics,areaDescriptor,analysisKey,matrix,view,analyze,analyzeWithMask,render,display,encode,quantile};
})(globalThis);
