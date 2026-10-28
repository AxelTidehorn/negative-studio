(function(root){
'use strict';
const V=root.NSConversionV2,quantile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)]??0;};
function analyzeFull(im,k){const values=[],step=Math.max(1,Math.ceil(im.width*im.height/24000));for(let p=0;p<im.width*im.height;p+=step){const r=k.pixel(V.read(im,p*3));if(!r.flags.invalid.some(Boolean)&&!r.flags.floor.some(Boolean))values.push(V.luminance(r.positive));}
 const median=quantile(values,.5),spread=quantile(values,.95)-quantile(values,.05),ok=values.length>=16&&median>0&&spread>1e-8,exposure=ok?Math.max(-1,Math.min(1,Math.log2(.18/median))):0;
 return V.freeze({schema:'RenderIntentV1',version:1,id:'tone-'+V.uuid(),analysisVersion:'full-source-stratified-1',sourceRevision:k.source.revision,calibrationId:k.calibration.id,baseId:k.base.id,status:ok?'estimated':'prior',exposure,tone:'luminance-reinhard-1',colorCorrection:{version:1,status:'prior',kind:'identity'},sampleCount:values.length,median});}
// Content selection is source anchored and belongs only to RenderIntent.
// It does not modify BaseReference or CalibrationV2, and never reads crop/zoom.
function analyzeWithMask(im,k,{maskMode='content'}={}){
 const cols=Math.min(160,im.width),rows=Math.min(im.height,Math.max(1,Math.floor(24000/cols))),n=cols*rows,luma=new Float64Array(n),kind=new Uint8Array(n),edge=new Uint8Array(n),mask=new Uint8Array(n),queue=new Uint32Array(n),knownBase=k.base.origin!=='prior';let head=0,tail=0;
 const counts={invalid:0,clipped:0,logFloor:0,edgeBase:0,edgeHolder:0,edgeClear:0,kept:0};
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
  const excluded=kind[i]===1||kind[i]===3||(maskMode!=='all'&&(kind[i]===2||edge[i]));mask[i]=excluded?0:1;
  if(mask[i]){values.push(luma[i]);counts.kept++;}
  else if(kind[i]===1)counts.invalid++;else if(kind[i]===3)counts.logFloor++;else if(kind[i]===2)counts.clipped++;else if(kind[i]===4)counts.edgeBase++;else if(kind[i]===5)counts.edgeHolder++;else if(kind[i]===6)counts.edgeClear++;
  hash=Math.imul(hash^mask[i],16777619)>>>0;
 }
 const median=quantile(values,.5),spread=quantile(values,.95)-quantile(values,.05),ok=values.length>=16&&values.length>=n*.05&&median>0&&spread>1e-8,requested=ok?Math.log2(.18/median):0,exposure=ok?Math.max(-1,Math.min(1,requested)):0;
 const analysis={version:2,mode:maskMode==='all'?'full-source-grid-2':'edge-connected-content-2',status:ok?'estimated':'insufficient',sourceRevision:k.source.revision,baseId:k.base.id,cols,rows,samples:n,counts,keptFraction:values.length/n,maskId:'mask-'+hash.toString(16),baseEvidence:knownBase?'measured':'prior',assumption:'Heuristic edge-connected base/holder/clear regions; not semantic subject detection',fullSourceMedian:quantile(all,.5),fullSourceRequestedEV:all.length?Math.log2(.18/Math.max(1e-30,quantile(all,.5))):null};
 const intent=V.freeze({schema:'RenderIntentV1',version:1,id:'tone-'+V.uuid(),analysisVersion:'source-content-2',sourceRevision:k.source.revision,calibrationId:k.calibration.id,baseId:k.base.id,status:ok?'estimated':'prior',exposure,requestedExposure:requested,exposureLimited:Math.abs(requested-exposure)>1e-12,tone:'luminance-reinhard-1',colorCorrection:{version:1,status:'prior',kind:'identity'},sampleCount:values.length,median,analysis});
 return {intent,mask:{cols,rows,data:mask,sourceRevision:k.source.revision,intentId:intent.id}};
}
function analyze(im,k,options){return analyzeWithMask(im,k,options).intent;}
function render(p,intent){if(intent?.schema!=='RenderIntentV1'||intent.version!==1||intent.tone!=='luminance-reinhard-1'||!Number.isFinite(intent.exposure)||Math.abs(intent.exposure)>1)throw Error('RENDER_INTENT_INVALID');const e=2**intent.exposure,y=V.luminance(p)*e;return p.map(v=>v*e/(1+y));}
// Explicit output boundary: Rec.2020 -> linear sRGB, neutral-axis gamut compression,
// then peak shoulder. Technical headroom survives until here.
const matrix=[[1.6604910021084345,-.5876411387885495,-.0728498633198848],[-.1245504745215907,1.13289989712596,-.0083494226043694],[-.0181507633549052,-.1005788980080074,1.1187296613629127]];
function display(p){let q=matrix.map(r=>r.reduce((s,v,k)=>s+v*p[k],0)),y=Math.max(0,.2126*q[0]+.7152*q[1]+.0722*q[2]),min=Math.min(...q),s=min<0?y/Math.max(1e-30,y-min):1;q=q.map(v=>Math.max(0,y+(v-y)*s));const peak=Math.max(...q),target=peak<=.8?peak:.8+.2*(-Math.expm1(-(peak-.8)/.2));return q.map(v=>peak>0?v*target/peak:0);}
const encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
function view(p,intent,mode='auto'){if(mode==='technical')return display(p);if(mode==='fixed')return display(render(p,{...intent,exposure:0}));if(mode==='auto')return display(render(p,intent));throw Error('VIEW_MODE_INVALID');}
root.NSV2Render={matrix,view,analyze,analyzeFull,analyzeWithMask,render,display,encode,quantile};
})(globalThis);
