/* Bounded source-domain measurements shared by the detector and rectangle tool.
   No full-image copy. A base is a region's RGB vector, never channelwise maxima. */
(function(root){
'use strict';
const C=root.NSColorEngine,q=C.quantile;
function quality({samples,clipped,dark,spread}){
 const reasons=[];if(samples<16)reasons.push('För få källprov');if(clipped.some(v=>v>.005))reasons.push('Kanalvis klippning');if(dark.some(v=>v>.01))reasons.push('Låg signal');if(spread.some(v=>v>.12))reasons.push('Ojämnt prov: textur, damm eller blandade ytor');
 return {status:reasons.length?'missing':spread.some(v=>v>.06)?'review':'safe',reasons};
}
function sourceSample(im,x,y){
 const p=C.pixel(im,x,y),i=(y*im.width+x)*(im.channels||3);
 return {p,clipped:p.map((v,c)=>v>=.995||(im.scale>1&&im.data[i+c]>=im.scale)),dark:p.map(v=>!Number.isFinite(v)||v<=.003)};
}
function summarize(im,ps,regions,kind){
 const n=ps.length,measured=[0,1,2].map(c=>q(ps.map(s=>s.p[c]),.5));
 const mad=measured.map((m,c)=>q(ps.map(s=>Math.abs(s.p[c]-m)),.5));
 const spread=measured.map((m,c)=>(q(ps.map(s=>s.p[c]),.95)-q(ps.map(s=>s.p[c]),.05))/Math.max(m,1/65535));
 const clipped=[0,1,2].map(c=>ps.filter(s=>s.clipped[c]).length/Math.max(1,n)),dark=[0,1,2].map(c=>ps.filter(s=>s.dark[c]).length/Math.max(1,n));
 const assessment=quality({samples:n,clipped,dark,spread});
 if(ps.some(s=>s.p.some(v=>!Number.isFinite(v)))){assessment.status='missing';assessment.reasons.push('Ogiltiga källvärden');}
 const {status,reasons}=assessment;
 return {version:2,kind,region:regions[0],...(regions.length>1?{regions}:{}),measured,shape:C.normalizeBase(measured),mad,spread,clipped,dark,samples:n,status,reasons:reasons.length?reasons:status==='review'?['Kontrollera variationen i provet']:[],confidence:status==='missing'?0:Math.max(.1,1-Math.max(...spread)*4),domain:'normalized-linear-'+(im.colorSpace||'srgb')};
}
function measureRegions(im,regions,{limit=8192,kind='auto-region',samplePixel=sourceSample}={}){
 const rs=regions.map(C.rect),bs=rs.map(r=>C.bounds(im,r)),ps=[];
 const area=bs.reduce((n,b)=>n+(b.x1-b.x0)*(b.y1-b.y0),0),step=Math.max(1,Math.ceil(Math.sqrt(area/limit)));
 // Stratified source coordinates and the same per-pixel clipping union in both paths.
 for(const b of bs)for(let y=b.y0;y<b.y1;y+=step)for(let x=b.x0;x<b.x1;x+=step){const hash=((x*73856093)^(y*19349663))>>>0;ps.push(samplePixel(im,Math.min(b.x1-1,x+hash%step),Math.min(b.y1-1,y+(hash>>>8)%step)));}
 return summarize(im,ps,rs,kind);
}
function measure(im,region,{limit=2048,kind='manual-region'}={}){return measureRegions(im,[region],{limit,kind});}
const agrees=(a,b,tolerance=.06)=>a.every((v,c)=>Math.abs(v-b[c])/Math.max(v,b[c],.01)<tolerance);
function candidate(im,regions,r,refined=false){
 // Re-sample the merged SOURCE regions: never infer zero clipping/darkness from cell screening.
 const sampleLimit=refined?512:2048,m=measureRegions(im,regions,{limit:sampleLimit}),outside=regions.filter(a=>{const x=a.x+a.w/2,y=a.y+a.h/2;return x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h;}),eligible=outside.length>=2;
 const orange=m.measured[0]>m.measured[1]*1.1&&m.measured[1]>m.measured[2]*1.05;
 const distance=regions.reduce((n,a)=>{const x=a.x+a.w/2,y=a.y+a.h/2;return n+Math.min(Math.abs(x-r.x),Math.abs(x-r.x-r.w),Math.abs(y-r.y),Math.abs(y-r.y-r.h));},0)/regions.length;
 const proximity=Math.max(0,1-distance*24);
 return {...m,sampleLimit,regions,eligible,refined,score:Math.min(...m.measured)*.2+Math.min(.04,regions.length*.001)+(orange?.015:0)+proximity*.2};
}
function* refineSteps(im,r){
 const found=[],seen=new Set();let probes=0;
 // Local cross-sections near each frame boundary plus sparse full-length sections
 // for between-frame gaps. At most 32 local + 8 global scans; no raster copy.
 for(const axis of ['x','y'])for(let j=0;j<8;j++){
  const horizontal=axis==='x',size=horizontal?im.width:im.height,longSize=horizontal?im.height:im.width,anchor=(j+.5)/8;
  const edges=horizontal?[r.x,r.x+r.w]:[r.y,r.y+r.h];
  const ranges=[...edges.map(edge=>[Math.max(0,Math.floor((edge-1/24)*size)),Math.min(size,Math.ceil((edge+1/24)*size)),256]),...(j%2===0?[[0,size,2048]]:[])];
  for(const [lo,hi,budget]of ranges){
   const step=Math.max(1,Math.ceil((hi-lo)/budget)),at=Math.min(longSize-1,Math.floor(anchor*longSize)),runs=[];let run=null;
   const read=k=>sourceSample(im,horizontal?k:at,horizontal?at:k);
   for(let k=lo;k<hi;k+=step){const s=read(k),clean=!s.clipped.some(Boolean)&&!s.dark.some(Boolean);
    if(clean&&run&&agrees(s.p,run.p)){run.hi=k+1;continue;}
    if(run)runs.push(run);run=clean?{lo:k,hi:k+1,p:s.p}:null;
   }if(run)runs.push(run);
   runs.sort((a,b)=>Math.min(...b.p)-Math.min(...a.p));
   for(const run of runs.slice(0,6)){
    // Refine the sampled run's two boundaries in original pixels. This recovers
    // a 2–3px rebate even when it lies inside a rejected coarse mixed cell.
    let a=run.lo,b=run.hi;for(let n=0;n<step&&a>lo;n++){const s=read(a-1);if(s.clipped.some(Boolean)||s.dark.some(Boolean)||!agrees(s.p,run.p))break;a--;}
    for(let n=0;n<step&&b<hi;n++){const s=read(b);if(s.clipped.some(Boolean)||s.dark.some(Boolean)||!agrees(s.p,run.p))break;b++;}
    if((a===lo&&lo>0)||(b===hi&&hi<size)||(b-a)/size>1/24)continue;
    // Smooth motif gradients split by a tolerance are not narrow film bands.
    const sharp=k=>!agrees(read(k).p,run.p,.12);
    if((a>0&&!sharp(a-1))||(b<size&&!sharp(b)))continue;
    const region=horizontal?{x:a/size,y:j/8,w:(b-a)/size,h:1/8}:{x:j/8,y:a/size,w:1/8,h:(b-a)/size};
    const key=JSON.stringify(region);if(seen.has(key))continue;seen.add(key);
    if(probes>=384||found.length>=192)continue;
    const m=measure(im,region,{limit:64,kind:'auto-region'});probes++;
    if(m.status!=='missing')found.push({region,m,axis});
    else for(let part=0;part<4&&probes<384&&found.length<192;part++){
     const sub=horizontal?{...region,y:region.y+region.h*part/4,h:region.h/4}:{...region,x:region.x+region.w*part/4,w:region.w/4};
     const key=JSON.stringify(sub);if(seen.has(key))continue;seen.add(key);
     const m=measure(im,sub,{limit:64,kind:'auto-region'});probes++;if(m.status!=='missing')found.push({region:sub,m,axis});
    }
   }
  }yield;
 }
 return found;
}
function* detectSteps(im,frame){
 const r=C.rect(frame),nx=24,ny=24,cells=new Map(),visited=new Set();
 for(let y=0;y<ny;y++){for(let x=0;x<nx;x++){
  const region={x:x/nx,y:y/ny,w:1/nx,h:1/ny},cx=(x+.5)/nx,cy=(y+.5)/ny;
  const outside=cx<r.x||cx>r.x+r.w||cy<r.y||cy>r.y+r.h,m=measure(im,region,{limit:36,kind:'auto-region'});
  if(m.status!=='missing')cells.set(y*nx+x,{x,y,m,outside});
 }yield;}
 const groups=[];
 for(const [key,cell]of cells){if(visited.has(key))continue;visited.add(key);const members=[cell],todo=[cell];
  while(todo.length){const a=todo.pop();for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=a.x+dx,y=a.y+dy,k=y*nx+x,b=cells.get(k);if(x<0||x>=nx||y<0||y>=ny||!b||visited.has(k))continue;
   if(agrees(b.m.measured,cell.m.measured)){visited.add(k);members.push(b);todo.push(b);}
  }}
  if(members.length<2)continue;
  const outside=members.filter(a=>a.outside),eligible=outside.length>=2;
  const minX=Math.min(...members.map(a=>a.x)),maxX=Math.max(...members.map(a=>a.x)),minY=Math.min(...members.map(a=>a.y)),maxY=Math.max(...members.map(a=>a.y));
  if(!eligible&&(maxX-minX<nx*.5&&maxY-minY<ny*.5))continue;
  groups.push(candidate(im,(eligible?outside:members).map(a=>a.m.region),r));yield;
 }
 const strongCoarse=groups.some(a=>a.status==='safe'&&a.eligible&&a.regions.length>=8&&!a.shape.every(v=>v>.92));
 const refined=strongCoarse?[]:yield* refineSteps(im,r),used=new Set();
 for(let i=0;i<refined.length;i++){
  if(used.has(i))continue;const a=refined[i],regions=[a.region];used.add(i);
  // Join touching, non-overlapping sections of the same thin run. Gaps remain
  // gaps; holes/holder pixels are never included by a bounding rectangle.
  const todo=[a];while(todo.length){const previous=todo.pop();for(let j=0;j<refined.length;j++){const b=refined[j];if(used.has(j)||a.axis!==b.axis||!agrees(a.m.measured,b.m.measured))continue;
   const k=a.axis,w=a.axis==='x'?'w':'h',l=a.axis==='x'?'y':'x',h=a.axis==='x'?'h':'w';
   const overlap=Math.min(previous.region[k]+previous.region[w],b.region[k]+b.region[w])-Math.max(previous.region[k],b.region[k]);
   const touches=Math.abs(previous.region[l]+previous.region[h]-b.region[l])<1e-8||Math.abs(b.region[l]+b.region[h]-previous.region[l])<1e-8;
   if(overlap<=0||!touches||regions.some(c=>Math.min(c.x+c.w,b.region.x+b.region.w)>Math.max(c.x,b.region.x)+1e-8&&Math.min(c.y+c.h,b.region.y+b.region.h)>Math.max(c.y,b.region.y)+1e-8))continue;
   regions.push(b.region);used.add(j);todo.push(b);
  }}
  groups.push(candidate(im,regions,r,true));yield;
 }
 if(!groups.length)return {version:2,status:'missing',reasons:['Ingen sammanhängande homogen filmbasyta hittades'],candidates:[]};
 const interior=C.sample(im,r,.02,1500),upper=[0,1,2].map(c=>q(interior.map(p=>p[c]),.98));
 const plausible=groups.filter(a=>a.measured.every((v,c)=>v>=upper[c]*.94));
 if(!plausible.length)return {version:2,status:'missing',reasons:['Kandidaterna är tätare än motivets ljusaste källvärden'],candidates:groups.slice(0,6)};
 plausible.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score);
 groups.splice(0,groups.length,...plausible);const best=groups[0];
 Object.assign(best,measureRegions(im,best.regions,{limit:8192}),{sampleLimit:8192});
 if(best.measured.some((v,c)=>v<upper[c]*.94))return {version:2,status:'missing',reasons:['Kandidaten är tätare än motivets ljusaste källvärden'],candidates:groups.slice(0,6)};
 if(best.status==='missing')return {version:2,status:'missing',reasons:best.reasons,candidates:groups.slice(0,6)};
 const conflicting=groups.slice(1).some(a=>a.status!=='missing'&&a.eligible&&a.score>=best.score*.85&&a.shape.some((v,c)=>Math.abs(v-best.shape[c])>.07));
 const neutral=best.shape.every(v=>v>.92),reasons=[...best.reasons];
 if(!best.eligible)reasons.push('Inre korridor: kan vara motiv, välj och kontrollera manuellt');
 if(best.refined)reasons.push('Förfinat smalt område: kontrollera filmkant, perforering och hållare');
 const sides=new Set();for(const region of best.regions){const x=region.x+region.w/2,y=region.y+region.h/2;if(x<r.x)sides.add('left');if(x>r.x+r.w)sides.add('right');if(y<r.y)sides.add('top');if(y>r.y+r.h)sides.add('bottom');}
 if(sides.size<2)reasons.push('Endast en kant ger stöd för kandidaten');
 if(neutral)reasons.push('Neutral yta kan vara svartvit filmbas eller belyst hållare');
 if(conflicting)reasons.push('Regionerna ger olika basfärg');
 const status=reasons.length?'review':'safe';
 return {...best,status,reasons,confidence:status==='safe'?.85:.35,candidates:groups.slice(0,6).map(({score,eligible,...a})=>a)};
}
function detect(im,frame){const iterator=detectSteps(im,frame);let item;do{item=iterator.next();}while(!item.done);return item.value;}
async function detectAsync(im,frame,isCurrent=()=>true){const iterator=detectSteps(im,frame);while(isCurrent()){const item=iterator.next();if(item.done)return item.value;await new Promise(resolve=>setTimeout(resolve,0));}return null;}
root.NSFilmBaseMeasurement={measure,measureRegions,detect,detectAsync};
})(globalThis);
