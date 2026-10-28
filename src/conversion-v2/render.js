(function(root){
'use strict';
const V=root.NSConversionV2,quantile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)]??0;};
// Experimental E1 recipe, frozen before looking at validation images 09/10.
// The EV envelope is a numerical guard (16-bit signal range), not a +1 EV look.
const exposureRecipe=V.freeze({version:'robust-p60-highlight-1',target:.25,highlightCeiling:3,minSamples:16,minValidFraction:.05,maxAbsEV:16});
const trustedArea=area=>area?.status==='confirmed'||area?.status==='estimated'&&area.confidence>=.67;
const fullRegion={x:0,y:0,w:1,h:1};
function areaDescriptor(area){
 const r=area?.region,valid=r&&['x','y','w','h'].every(c=>Number.isFinite(r[c]))&&r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=1.000001&&r.y+r.h<=1.000001;
 const automatic=valid&&area.status==='estimated'&&area.method==='application-frame'&&Number.isFinite(area.confidence)&&area.confidence>=.67&&area.confidence<=1;return {region:valid?{x:r.x,y:r.y,w:r.w,h:r.h}:{...fullRegion},status:valid&&area.status==='confirmed'?'confirmed':automatic?'estimated':valid?'unconfirmed':area?'invalid':'missing',method:valid&&area.status==='confirmed'?'manual-frame':automatic?'application-frame':'unconfirmed-frame',confidence:automatic?area.confidence:valid&&area.status==='confirmed'?1:0};
}
function analysisKey(k,options={}){return JSON.stringify({version:exposureRecipe.version,colorVersion:balanceRecipe.version,colorMode:options.colorMode==='identity'?'identity':'auto',source:k.source,base:{domain:k.base.domain,rgb:k.base.rgb,measured:k.base.origin!=='prior'},calibration:k.calibration,area:areaDescriptor(options.analysisArea),maskMode:options.maskMode==='all'?'all':'content'});}
// Public fingerprint is opaque; exact signatures stay private in the worker.
function fingerprint(text){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;return 'analysis-'+hash.toString(16);}
function exposureFromStatistics({p50,p60,p99,samples=0,validFraction=0,areaStatus='missing',areaConfidence=0}={}){
 let fallback=!trustedArea({status:areaStatus,confidence:areaConfidence})?'ANALYSIS_AREA_UNCONFIRMED':!Number.isSafeInteger(samples)||!Number.isFinite(validFraction)||validFraction<0||validFraction>1?'INVALID_SAMPLE_STATISTICS':samples<exposureRecipe.minSamples||validFraction<exposureRecipe.minValidFraction?'INSUFFICIENT_VALID_SAMPLES':![p50,p60,p99].every(v=>Number.isFinite(v)&&v>0)||p99<p60||p60<p50?'INVALID_LUMINANCE_STATISTICS':null;
 const midEV=Number.isFinite(p60)&&p60>0?Math.log2(exposureRecipe.target)-Math.log2(p60):null,highlightEV=Number.isFinite(p99)&&p99>0?Math.log2(exposureRecipe.highlightCeiling)-Math.log2(p99):null;
 // Stable log-domain equivalent of e_mid / hypot(1,e_mid/e_hi).
 const delta=midEV-highlightEV,softEV=midEV===null||highlightEV===null?null:delta>0?highlightEV-.5*Math.log2(1+2**(-2*delta)):midEV-.5*Math.log2(1+2**(2*delta));
 if(!fallback&&(!Number.isFinite(softEV)||Math.abs(softEV)>exposureRecipe.maxAbsEV))fallback='EXPOSURE_OUTSIDE_NUMERICAL_ENVELOPE';
 return {recipe:exposureRecipe,percentiles:{p50:Number.isFinite(p50)?p50:null,p60:Number.isFinite(p60)?p60:null,p99:Number.isFinite(p99)?p99:null},requestedEV:midEV,highlightEV,softEV,appliedEV:fallback?0:softEV,highlightReductionEV:fallback?0:midEV-softEV,highlightLimited:!fallback&&midEV!==null&&softEV!==null&&midEV-softEV>1e-6,fallback};
}
// A bounded positive-domain hypothesis, never a film-response calibration.
const balanceRecipe=V.freeze({version:'neutral-anchor-bands-1',binEV:.18,maxAnchorSpanEV:1.75,maxAnchorAxisEV:1.25,maxCorrectionEV:.6,strength:.85,minSupport:32,minTiles:4,minDiversity:.15,maxBandDifferenceEV:.65});
const identityBalance=reason=>({version:1,kind:'identity',status:'prior',recipeVersion:balanceRecipe.version,reason,gains:[[1,1,1],[1,1,1],[1,1,1]],knots:[0,1,2],evidence:[]});
function estimateBalance(positive,luma,mask,cols,rows,area,enabled=true){
 if(!enabled)return identityBalance('EXPLICIT_IDENTITY');
 if(!trustedArea(area))return identityBalance('ANALYSIS_AREA_UNCONFIRMED');
 const points=[];for(let i=0;i<mask.length;i++)if(mask[i]){const p=positive.subarray(i*3,i*3+3),u=Math.log2(p[0]/p[1]),v=Math.log2(p[2]/p[1]);if(Number.isFinite(u)&&Number.isFinite(v)&&luma[i]>0){const x=((i%cols+.5)/cols-area.region.x)/area.region.w,y=((Math.floor(i/cols)+.5)/rows-area.region.y)/area.region.h;points.push({u,v,y:luma[i],tile:Math.min(3,Math.max(0,Math.floor(y*4)))*4+Math.min(3,Math.max(0,Math.floor(x*4)))});}}
 if(points.length<128)return identityBalance('INSUFFICIENT_COLOR_SAMPLES');
 const ys=points.map(p=>p.y),q05=quantile(ys,.05),q55=quantile(ys,.55),q90=quantile(ys,.9);if(!(q05<q55&&q55<q90))return identityBalance('INSUFFICIENT_LUMINANCE_RANGE');
 function anchor(low,high){
  const lo=quantile(ys,low),hi=quantile(ys,high),pool=points.filter(p=>p.y>=lo&&p.y<=hi&&Math.max(Math.abs(p.u),Math.abs(p.v))<=balanceRecipe.maxAnchorAxisEV&&Math.max(0,p.u,p.v)-Math.min(0,p.u,p.v)<=balanceRecipe.maxAnchorSpanEV),bins=new Map();
  for(const p of pool){const x=Math.floor(p.u/balanceRecipe.binEV),y=Math.floor(p.v/balanceRecipe.binEV),id=x+','+y;if(!bins.has(id))bins.set(id,{x,y,points:[]});bins.get(id).points.push(p);}
  const candidates=[...bins.values()].map(cell=>{const members=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)members.push(...(bins.get((cell.x+x)+','+(cell.y+y))?.points||[]));return {members,count:members.length};}).sort((a,b)=>b.count-a.count);
  const best=candidates[0];if(!best||best.count<balanceRecipe.minSupport)return {status:'missing',reason:'INSUFFICIENT_NEUTRAL_ANCHORS'};
  const u=quantile(best.members.map(p=>p.u),.5),v=quantile(best.members.map(p=>p.v),.5),tiles=new Set(best.members.map(p=>p.tile)).size,diversity=points.filter(p=>Math.max(Math.abs(p.u-u),Math.abs(p.v-v))>.4).length/points.length;
  const other=candidates.find(c=>{if(c.count<best.count*.8)return false;const cu=quantile(c.members.map(p=>p.u),.5),cv=quantile(c.members.map(p=>p.v),.5);return Math.max(Math.abs(cu-u),Math.abs(cv-v))>.6;});
  if(tiles<balanceRecipe.minTiles||diversity<balanceRecipe.minDiversity||other)return {status:'missing',reason:other?'AMBIGUOUS_NEUTRAL_CLUSTERS':tiles<balanceRecipe.minTiles?'LOCALIZED_COLOR_ANCHOR':'DOMINANT_COLOR_AMBIGUITY',support:best.count,tiles,diversity};
  const confidence=Math.min(1,tiles/8)*Math.min(1,best.count/Math.max(1,pool.length*.25))*Math.min(1,diversity/.25),raw=[-u,0,-v],center=raw[0]*.2627+raw[1]*.678+raw[2]*.0593,ev=raw.map(c=>Math.max(-balanceRecipe.maxCorrectionEV,Math.min(balanceRecipe.maxCorrectionEV,(c-center)*balanceRecipe.strength*confidence)));
  return {status:'estimated',logRatios:[u,v],EV:ev,gain:ev.map(v=>2**v),support:best.count,tiles,diversity,confidence,band:[low,high]};
 }
 const mid=anchor(.30,.75),high=anchor(.70,.97),evidence=[mid,high];
 if(mid.status!=='estimated'&&high.status!=='estimated')return {...identityBalance('NO_SUPPORTED_NEUTRAL_ANCHOR'),evidence};
 if(mid.status==='estimated'&&high.status==='estimated'&&mid.logRatios.some((v,c)=>Math.abs(v-high.logRatios[c])>balanceRecipe.maxBandDifferenceEV))return {...identityBalance('BAND_DISAGREEMENT'),evidence};
 return {version:1,kind:'neutral-anchor-bands',status:'estimated',recipeVersion:balanceRecipe.version,recipe:balanceRecipe,reason:'STATISTICAL_NEUTRAL_SURFACE_HYPOTHESIS',knots:[q05,q55,q90],gains:[[1,1,1],mid.gain||[1,1,1],high.gain||[1,1,1]],evidence,assumption:'Spatially distributed recurring low-chroma surfaces across luminance bands; not proof of neutral illumination or film calibration'};
}
function prepareBalance(intent){const c=intent?.colorCorrection;if(!c||c.kind==='identity')return null;if(c.version!==1||c.kind!=='neutral-anchor-bands'||c.knots?.length!==3||!c.knots.every(Number.isFinite)||c.knots[0]<0||!(c.knots[0]<c.knots[1]&&c.knots[1]<c.knots[2])||c.gains?.length!==3||!c.gains.every(g=>g.length===3&&g.every(v=>Number.isFinite(v)&&v>=.25&&v<=4)))throw Error('COLOR_BALANCE_INVALID');return c;}
function balance(p,intent){const c=prepareBalance(intent);if(!c)return p;const y=V.luminance(p);if(y<=1e-30)return p;let band=y<c.knots[1]?0:1,t=Math.max(0,Math.min(1,(y-c.knots[band])/(c.knots[band+1]-c.knots[band])));t=t*t*(3-2*t);const q=p.map((v,i)=>v*(c.gains[band][i]+t*(c.gains[band+1][i]-c.gains[band][i]))),qy=V.luminance(q);return q.map(v=>v*y/qy);}
// Content selection is source anchored and belongs only to RenderIntent.
// It does not modify BaseReference or CalibrationV2, and never reads crop/zoom.
function analyzeWithMask(im,k,options={}){
 const {maskMode='content'}=options,area=areaDescriptor(options.analysisArea),region=area.region,key=analysisKey(k,options);
 const cols=Math.min(160,im.width),rows=Math.min(im.height,Math.max(1,Math.floor(24000/cols))),n=cols*rows,luma=new Float64Array(n),positive=new Float64Array(n*3),kind=new Uint8Array(n),edge=new Uint8Array(n),mask=new Uint8Array(n),queue=new Uint32Array(n),knownBase=k.base.origin!=='prior';let head=0,tail=0;
 const counts={invalid:0,clipped:0,logFloor:0,edgeBase:0,edgeHolder:0,edgeClear:0,outsideArea:0,kept:0};
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const sx=Math.min(im.width-1,Math.floor((x+.5)*im.width/cols)),sy=Math.min(im.height-1,Math.floor((y+.5)*im.height/rows)),j=V.read(im,(sy*im.width+sx)*3),r=k.pixel(j),i=y*cols+x;luma[i]=V.luminance(r.positive);positive.set(r.positive,i*3);
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
 const median=quantile(values,.5),p60=quantile(values,.6),p99=quantile(values,.99),areaSamples=n-counts.outsideArea,exposureAnalysis=exposureFromStatistics({p50:median,p60,p99,samples:values.length,validFraction:values.length/Math.max(1,areaSamples),areaStatus:area.status,areaConfidence:area.confidence}),ok=!exposureAnalysis.fallback,exposure=exposureAnalysis.appliedEV,requested=exposureAnalysis.requestedEV;

 const analysis={version:3,key:fingerprint(key),area,exposure:exposureAnalysis,mode:maskMode==='all'?'frame-source-grid-3':'frame-edge-connected-content-3',status:ok?'estimated':'insufficient',sourceRevision:k.source.revision,baseId:k.base.id,cols,rows,samples:n,counts,keptFraction:values.length/n,maskId:'mask-'+hash.toString(16),baseEvidence:knownBase?'measured':'prior',assumption:'Heuristic edge-connected base/holder/clear regions; not semantic subject detection',fullSourceMedian:quantile(all,.5),fullSourceRequestedEV:all.length?Math.log2(.18/Math.max(1e-30,quantile(all,.5))):null};
 const intent=V.freeze({schema:'RenderIntentV1',version:1,id:'tone-'+V.uuid(),analysisVersion:exposureRecipe.version,sourceRevision:k.source.revision,calibrationId:k.calibration.id,baseId:k.base.id,status:ok?'estimated':'prior',exposure,requestedExposure:requested,exposureLimited:exposureAnalysis.highlightLimited||!!exposureAnalysis.fallback,tone:'luminance-reinhard-1',colorCorrection:estimateBalance(positive,luma,mask,cols,rows,area,options.colorMode!=='identity'),sampleCount:values.length,median,analysis});
 return {intent,mask:{cols,rows,data:mask,sourceRevision:k.source.revision,intentId:intent.id}};
}
function analyze(im,k,options){return analyzeWithMask(im,k,options).intent;}
function toneOnly(p,intent){if(intent?.schema!=='RenderIntentV1'||intent.version!==1||intent.tone!=='luminance-reinhard-1'||!Number.isFinite(intent.exposure)||Math.abs(intent.exposure)>exposureRecipe.maxAbsEV)throw Error('RENDER_INTENT_INVALID');const e=2**intent.exposure,y=V.luminance(p)*e;return p.map(v=>v*e/(1+y));}
function render(p,intent){return toneOnly(balance(p,intent),intent);}
// Explicit output boundary: Rec.2020 -> linear sRGB, neutral-axis gamut compression,
// then peak shoulder. Technical headroom survives until here.
const matrix=[[1.6604910021084345,-.5876411387885495,-.0728498633198848],[-.1245504745215907,1.13289989712596,-.0083494226043694],[-.0181507633549052,-.1005788980080074,1.1187296613629127]];
function display(p){let q=matrix.map(r=>r.reduce((s,v,k)=>s+v*p[k],0)),y=Math.max(0,.2126*q[0]+.7152*q[1]+.0722*q[2]),min=Math.min(...q),s=min<0?y/Math.max(1e-30,y-min):1;q=q.map(v=>Math.max(0,y+(v-y)*s));const peak=Math.max(...q),target=peak<=.8?peak:.8+.2*(-Math.expm1(-(peak-.8)/.2));return q.map(v=>peak>0?v*target/peak:0);}
const encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
function view(p,intent,mode='auto'){if(mode==='technical')return display(p);if(mode==='fixed')return display(toneOnly(p,{...intent,exposure:0}));if(mode==='auto')return display(render(p,intent));throw Error('VIEW_MODE_INVALID');}
root.NSV2Render={balanceRecipe,estimateBalance,prepareBalance,balance,toneOnly,trustedArea,exposureRecipe,exposureFromStatistics,areaDescriptor,analysisKey,matrix,view,analyze,analyzeWithMask,render,display,encode,quantile};
})(globalThis);
