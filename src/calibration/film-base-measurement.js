/* Bounded source-domain measurements shared by the detector and rectangle tool.
   No full-image copy. A base is a region's RGB vector, never channelwise maxima. */
(function(root){
'use strict';
const C=root.NSColorEngine,q=C.quantile;
function quality({samples,clipped,dark,spread}){
 const reasons=[];if(samples<16)reasons.push('För få källprov');if(clipped.some(v=>v>.005))reasons.push('Kanalvis klippning');if(dark.some(v=>v>.01))reasons.push('Låg signal');if(spread.some(v=>v>.12))reasons.push('Ojämnt prov: textur, damm eller blandade ytor');
 return {status:reasons.length?'missing':spread.some(v=>v>.06)?'review':'safe',reasons};
}
function measure(im,region,{limit=2048,kind='manual-region'}={}){
 const r=C.rect(region),b=C.bounds(im,r),ps=[],rawClip=[0,0,0],step=Math.max(1,Math.ceil(Math.sqrt((b.x1-b.x0)*(b.y1-b.y0)/limit)));
 // Deterministic stratified offsets avoid aliasing text/perforations into a flat sample.
 for(let y=b.y0;y<b.y1;y+=step)for(let x=b.x0;x<b.x1;x+=step){const hash=((x*73856093)^(y*19349663))>>>0;const xx=Math.min(b.x1-1,x+hash%step),yy=Math.min(b.y1-1,y+(hash>>>8)%step);ps.push(C.pixel(im,xx,yy));if(im.scale>1){const i=(yy*im.width+xx)*(im.channels||3);for(let c=0;c<3;c++)if(im.data[i+c]>=im.scale)rawClip[c]++;}}
 const n=ps.length;
 const measured=[0,1,2].map(c=>q(ps.map(p=>p[c]),.5));
 const mad=measured.map((m,c)=>q(ps.map(p=>Math.abs(p[c]-m)),.5));
 const spread=measured.map((m,c)=>(q(ps.map(p=>p[c]),.95)-q(ps.map(p=>p[c]),.05))/Math.max(m,1/65535));
 const clipped=[0,1,2].map(c=>Math.max(rawClip[c],ps.filter(p=>p[c]>=.995).length)/n),dark=[0,1,2].map(c=>ps.filter(p=>p[c]<=.003).length/n);
 const {status,reasons}=quality({samples:n,clipped,dark,spread});
 return {version:2,kind,region:r,measured,shape:C.normalizeBase(measured),mad,spread,clipped,dark,samples:n,status,reasons:reasons.length?reasons:status==='review'?['Kontrollera variationen i provet']:[],confidence:status==='missing'?0:Math.max(.1,1-Math.max(...spread)*4),domain:'normalized-linear-'+(im.colorSpace||'srgb')};
}
function* detectSteps(im,frame){
 const r=C.rect(frame),nx=24,ny=24,cells=new Map(),visited=new Set();
 // Grid extends across rebate, all margins and possible inter-frame corridors.
 // Interior regions can only be offered for manual review, never called measured rebate.
 for(let y=0;y<ny;y++){for(let x=0;x<nx;x++){
  const region={x:x/nx,y:y/ny,w:1/nx,h:1/ny},cx=(x+.5)/nx,cy=(y+.5)/ny;
  const outside=cx<r.x||cx>r.x+r.w||cy<r.y||cy>r.y+r.h;
  const m=measure(im,region,{limit:36,kind:'auto-region'});
  if(m.status==='missing')continue;
  cells.set(y*nx+x,{x,y,m,outside});
 }yield;}
 const groups=[];
 for(const [key,cell]of cells){if(visited.has(key))continue;visited.add(key);const members=[cell],todo=[cell];
  while(todo.length){const a=todo.pop();for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=a.x+dx,y=a.y+dy,k=y*nx+x,b=cells.get(k);if(x<0||x>=nx||y<0||y>=ny||!b||visited.has(k))continue;
   if(b.m.measured.every((v,c)=>Math.abs(v-cell.m.measured[c])/Math.max(v,cell.m.measured[c],.01)<.06)){visited.add(k);members.push(b);todo.push(b);}
  }}
  if(members.length<2)continue;
  const outside=members.filter(a=>a.outside),eligible=outside.length>=2;
  const minX=Math.min(...members.map(a=>a.x)),maxX=Math.max(...members.map(a=>a.x)),minY=Math.min(...members.map(a=>a.y)),maxY=Math.max(...members.map(a=>a.y));
  if(!eligible&&(maxX-minX<nx*.5&&maxY-minY<ny*.5))continue;
  // Sample only actual homogeneous cells, not their potentially contaminated bounding box.
  const selected=eligible?outside:members,ps=selected.flatMap(a=>C.sample(im,a.m.region,0,16));
  const measured=[0,1,2].map(c=>q(ps.map(p=>p[c]),.5)),shape=C.normalizeBase(measured);
  const orange=measured[0]>measured[1]*1.1&&measured[1]>measured[2]*1.05;
  groups.push({version:2,kind:'auto-region',measured,shape,regions:selected.map(a=>a.m.region),region:selected[0].m.region,samples:ps.length,mad:[0,1,2].map(c=>q(ps.map(p=>Math.abs(p[c]-measured[c])),.5)),spread:[0,1,2].map(c=>(q(ps.map(p=>p[c]),.95)-q(ps.map(p=>p[c]),.05))/measured[c]),clipped:[0,0,0],dark:[0,0,0],eligible,score:Math.min(...measured)+Math.min(.04,selected.length*.001)+(orange?.015:0),domain:'normalized-linear-'+(im.colorSpace||'srgb')});
 }
 if(!groups.length)return {version:2,status:'missing',reasons:['Ingen sammanhängande homogen filmbasyta hittades'],candidates:[]};
 groups.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score);const best=groups[0];
 const interior=C.sample(im,r,.02,1500),upper=[0,1,2].map(c=>q(interior.map(p=>p[c]),.98));
 if(best.measured.some((v,c)=>v<upper[c]*.94))return {version:2,status:'missing',reasons:['Kandidaten är tätare än motivets ljusaste källvärden'],candidates:groups.slice(0,6)};
 const conflicting=groups.slice(1).some(a=>a.eligible&&a.score>=best.score*.85&&a.shape.some((v,c)=>Math.abs(v-best.shape[c])>.07));
 const assessment=quality(best);if(assessment.status==='missing')return {version:2,status:'missing',reasons:assessment.reasons,candidates:groups.slice(0,6)};
 const neutral=best.shape.every(v=>v>.92),reasons=assessment.status==='review'?['Kontrollera variationen mellan regionerna']:[];
 if(!best.eligible)reasons.push('Inre korridor: kan vara motiv, välj och kontrollera manuellt');
 const sides=new Set();for(const region of best.regions){const x=region.x+region.w/2,y=region.y+region.h/2;if(x<r.x)sides.add('left');if(x>r.x+r.w)sides.add('right');if(y<r.y)sides.add('top');if(y>r.y+r.h)sides.add('bottom');}
 if(sides.size<2)reasons.push('Endast en kant ger stöd för kandidaten');
 if(neutral)reasons.push('Neutral yta kan vara svartvit filmbas eller belyst hållare');
 if(conflicting)reasons.push('Regionerna ger olika basfärg');
 const status=reasons.length?'review':'safe';
 return {...best,status,reasons,confidence:status==='safe'?.85:.35,candidates:groups.slice(0,6).map(({score,eligible,...a})=>a)};
}
function detect(im,frame){const iterator=detectSteps(im,frame);let item;do{item=iterator.next();}while(!item.done);return item.value;}
async function detectAsync(im,frame,isCurrent=()=>true){const iterator=detectSteps(im,frame);while(isCurrent()){const item=iterator.next();if(item.done)return item.value;await new Promise(resolve=>setTimeout(resolve,0));}return null;}
root.NSFilmBaseMeasurement={measure,detect,detectAsync};
})(globalThis);
