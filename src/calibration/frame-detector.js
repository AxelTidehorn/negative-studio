/* Bounded source-coordinate contour hypotheses. Independently implemented;
   no film-format/aspect-ratio prior, image rotation or resampling of the source. */
(function(root){
'use strict';
const full=()=>({x:0,y:0,w:1,h:1}),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const quant=(a,q)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor((b.length-1)*q)]||0;};
function hull(points){
 const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),a=[],b=[];
 for(const v of p){while(a.length>1&&cross(a.at(-2),a.at(-1),v)<=0)a.pop();a.push(v);}
 for(let i=p.length-1;i>=0;i--){const v=p[i];while(b.length>1&&cross(b.at(-2),b.at(-1),v)<=0)b.pop();b.push(v);}
 return a.slice(0,-1).concat(b.slice(0,-1));
}
const area=p=>Math.abs(p.reduce((s,v,i)=>s+v.x*p[(i+1)%p.length].y-v.y*p[(i+1)%p.length].x,0))/2;
function validQuad(p){return Array.isArray(p)&&p.length===4&&p.every(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=0&&v.x<=1&&v.y>=0&&v.y<=1)&&p.every((v,i)=>cross(v,p[(i+1)%4],p[(i+2)%4])>1e-10);}
function contains(p,x,y){return p.every((v,i)=>cross(v,p[(i+1)%4],{x,y})>=-1e-12);}
function bounds(p){const x=Math.min(...p.map(v=>v.x)),y=Math.min(...p.map(v=>v.y));return {x,y,w:Math.max(...p.map(v=>v.x))-x,h:Math.max(...p.map(v=>v.y))-y};}
function intersect(a,b){const d=a.nx*b.ny-a.ny*b.nx;if(Math.abs(d)<1e-6)return null;return {x:(a.d*b.ny-a.ny*b.d)/d,y:(a.nx*b.d-a.d*b.nx)/d};}
function lines(p){return p.map((v,i)=>{const q=p[(i+1)%4],l=Math.hypot(q.x-v.x,q.y-v.y);return {nx:(v.y-q.y)/l,ny:(q.x-v.x)/l,d:((v.y-q.y)*v.x+(q.x-v.x)*v.y)/l};});}
function inset(p,pixels,w,h){const q=p.map(v=>({x:v.x*w,y:v.y*h})),ls=lines(q).map(l=>({...l,d:l.d+pixels})),out=ls.map((l,i)=>intersect(ls[(i+3)%4],l));if(out.some(v=>!v))return null;const n=out.map(v=>({x:v.x/w,y:v.y/h}));return validQuad(n)?n:null;}
// D65 CIELAB, normalized. Rec.2020 and linear sRGB use their own XYZ matrix.
function lab(rgb,wide){
 const m=wide?[.636958,.144617,.168881,.262700,.677998,.059302,0,.028073,1.060985]:[.412456,.357576,.180438,.212673,.715152,.072175,.019334,.119192,.950304];
 const f=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
 const x=f((m[0]*rgb[0]+m[1]*rgb[1]+m[2]*rgb[2])/.95047),y=f(m[3]*rgb[0]+m[4]*rgb[1]+m[5]*rgb[2]),z=f((m[6]*rgb[0]+m[7]*rgb[1]+m[8]*rgb[2])/1.08883);
 return [(116*y-16)/100,500*(x-y)/128,200*(y-z)/128];
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function close(mask,w,h){
 const a=new Uint8Array(mask.length),b=new Uint8Array(mask.length);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let v=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)v|=mask[(y+dy)*w+x+dx];a[y*w+x]=v;}
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){let v=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)v&=a[(y+dy)*w+x+dx];b[y*w+x]=v;}
 return b;
}
function components(mask,w,h){
 const seen=new Uint8Array(mask.length),queue=new Uint32Array(mask.length),out=[];
 for(let start=0;start<mask.length;start++)if(mask[start]&&!seen[start]){
  let head=0,tail=1,touch=false;queue[0]=start;seen[start]=1;const boundary=[];
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);let edge=false;if(x<2||y<2||x>=w-2||y>=h-2)touch=true;
   for(const j of [x?i-1:-1,x+1<w?i+1:-1,y?i-w:-1,y+1<h?i+w:-1]){if(j<0||!mask[j])edge=true;else if(!seen[j]){seen[j]=1;queue[tail++]=j;}}
   if(edge)boundary.push({x:x+.5,y:y+.5});
  }
  if(tail>=64&&boundary.length>=20)out.push({boundary,count:tail,touch});
 }
 return out.sort((a,b)=>b.count-a.count).slice(0,12);
}
function fit(boundary){
 const p=hull(boundary);if(p.length<4)return null;
 // Convex polygon reduction followed by line least squares. Unlike a fixed
 // min-area rectangle, intersections can retain a mild perspective quadrilateral.
 while(p.length>4){let k=0,v=Infinity;for(let i=0;i<p.length;i++){const n=Math.abs(cross(p[(i+p.length-1)%p.length],p[i],p[(i+1)%p.length]));if(n<v){v=n;k=i;}}p.splice(k,1);}
 const fitted=[];
 for(let i=0;i<4;i++){
  const a=p[i],b=p[(i+1)%4],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<4)return null;
  const ps=boundary.filter(v=>{const t=((v.x-a.x)*dx+(v.y-a.y)*dy)/(len*len);return t>.04&&t<.96&&Math.abs(cross(a,b,v))/len<1.8;});if(ps.length<4)return null;
  const mx=ps.reduce((s,v)=>s+v.x,0)/ps.length,my=ps.reduce((s,v)=>s+v.y,0)/ps.length;
  let xx=0,yy=0,xy=0;for(const v of ps){xx+=(v.x-mx)**2;yy+=(v.y-my)**2;xy+=(v.x-mx)*(v.y-my);}
  const angle=.5*Math.atan2(2*xy,xx-yy);let nx=-Math.sin(angle),ny=Math.cos(angle);if(nx*(-dy)+ny*dx<0){nx=-nx;ny=-ny;}
  fitted.push({nx,ny,d:nx*mx+ny*my-.5});
 }
 const q=fitted.map((l,i)=>intersect(fitted[(i+3)%4],l));if(q.some(v=>!v))return null;return q;
}
function edgeQuads(colors,w,h){
 const edges=[],magnitudes=[];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x;let gx=0,gy=0,mag=0;
  for(let c=0;c<3;c++){const dx=colors[i+1][c]-colors[i-1][c],dy=colors[i+w][c]-colors[i-w][c],m=Math.hypot(dx,dy);if(m>mag){mag=m;gx=dx;gy=dy;}}
  edges.push({x:x+.5,y:y+.5,mag,angle:(Math.atan2(gy,gx)*180/Math.PI+180)%180});magnitudes.push(mag);
 }
 const threshold=Math.max(.025,quant(magnitudes,.88)),diag=Math.ceil(Math.hypot(w,h)),stride=diag*2+1,votes=new Float32Array(180*stride),trig=Array.from({length:180},(_,a)=>[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)]);
 for(const p of edges)if(p.mag>=threshold)for(let da=-2;da<=2;da++){const a=(Math.round(p.angle)+da+180)%180,[c,s]=trig[a],r=Math.round(p.x*c+p.y*s)+diag;votes[a*stride+r]+=Math.min(3,p.mag/threshold);}
 const peaks=[];
 for(let a=0;a<180;a++)for(let r=1;r<stride-1;r++){const v=votes[a*stride+r];if(v>=14&&v>=votes[a*stride+r-1]&&v>=votes[a*stride+r+1])peaks.push({a,r:r-diag,v});}
 peaks.sort((a,b)=>b.v-a.v);const selected=[];
 for(const p of peaks){if(selected.some(q=>Math.abs(q.a-p.a)<4&&Math.abs(q.r-p.r)<4))continue;selected.push(p);if(selected.length===60)break;}
 for(const p of selected){
  const [nx,ny]=trig[p.a],ps=edges.filter(v=>v.mag>=threshold&&Math.min(Math.abs(v.angle-p.a),180-Math.abs(v.angle-p.a))<12&&Math.abs(v.x*nx+v.y*ny-p.r)<2);
  if(ps.length<8){p.line={nx,ny,d:p.r};continue;}
  const x=ps.reduce((s,v)=>s+v.x,0)/ps.length,y=ps.reduce((s,v)=>s+v.y,0)/ps.length;let xx=0,xy=0,yy=0;
  for(const v of ps){xx+=(v.x-x)**2;xy+=(v.x-x)*(v.y-y);yy+=(v.y-y)**2;}
  const a=.5*Math.atan2(2*xy,xx-yy);let lx=-Math.sin(a),ly=Math.cos(a);if(lx*nx+ly*ny<0){lx=-lx;ly=-ly;}p.line={nx:lx,ny:ly,d:lx*x+ly*y};
 }
 const orientations=[];for(const p of selected){const a=p.a%90;if(!orientations.some(q=>Math.min(Math.abs(q-a),90-Math.abs(q-a))<7))orientations.push(a);if(orientations.length===3)break;}
 const out=[];
 for(const angle of orientations){
  const group=base=>selected.filter(p=>Math.min(Math.abs(p.a-base),180-Math.abs(p.a-base))<3).slice(0,10).map(p=>{let {nx,ny,d}=p.line;const [bx,by]=trig[base];if(nx*bx+ny*by<0){nx=-nx;ny=-ny;d=-d;}return {nx,ny,d};}).sort((a,b)=>a.d-b.d);
  const aa=group(angle),bb=group(angle+90);
  for(let i=0;i<aa.length;i++)for(let j=i+1;j<aa.length;j++)for(let k=0;k<bb.length;k++)for(let l=k+1;l<bb.length;l++){
   const q=[intersect(aa[i],bb[k]),intersect(aa[j],bb[k]),intersect(aa[j],bb[l]),intersect(aa[i],bb[l])];
   if(q.every(Boolean)&&q.every((p,i)=>Math.hypot(p.x-q[(i+1)%4].x,p.y-q[(i+1)%4].y)>=4))out.push(q);
  }
 }
 return out;
}
function detect(im,{limit=480,debug=false,verify=true,strategy='hybrid'}={}){
 if(!['hybrid','contours','lines'].includes(strategy))throw Error('Unknown frame detector strategy');
 const C=root.NSColorEngine,small=C.preview(im,limit),w=small.width,h=small.height,n=w*h,colors=new Array(n),lum=new Float32Array(n),wide=im.colorSpace==='rec2020';
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;colors[i]=lab(C.pixel(small,x,y),wide);lum[i]=colors[i][0];}
 const at=(x,y)=>colors[Math.max(0,Math.min(h-1,Math.floor(y)))*w+Math.max(0,Math.min(w-1,Math.floor(x)))];
 // Homogeneous perimeter patches provide multiple background modes (e.g.
 // clear film AND a black holder). Hue is not predetermined or required.
 const models=[],clusters=[];
 for(const depth of [.012,.035]){if(depth>.012&&models.some(m=>m[0]>.25))break;for(let side=0;side<4;side++)for(let t=0;t<9;t++){
  const f=.03+.94*t/8,x=(side<2?(side?1-depth:depth):f)*w,y=(side<2?f:(side===3?1-depth:depth))*h,ps=[];
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)ps.push(at(x+dx,y+dy));
  const center=[0,1,2].map(c=>quant(ps.map(v=>v[c]),.5)),spread=quant(ps.map(v=>distance(v,center)),.8);
  if(spread<.025){let cluster=clusters.find(m=>distance(m.center,center)<.045);if(!cluster){cluster={center,count:0,sides:new Set()};clusters.push(cluster);}cluster.count++;cluster.sides.add(side);}
 }for(const c of clusters.filter(c=>c.count>=3&&c.sides.size>=2))if(!models.some(m=>distance(m,c.center)<.045))models.push(c.center);}
 const prototypes=models.slice(0,12),hypotheses=[];
 if(prototypes.length){for(const threshold of [.035,.065,.10]){const m=Uint8Array.from(colors,p=>prototypes.every(b=>distance(p,b)>threshold)?1:0);hypotheses.push({mask:m,name:'background-'+threshold});}}
 const ls=Array.from(lum);
 for(const fraction of [.2,.4,.6,.8]){const threshold=quant(ls,fraction);for(const bright of [false,true])hypotheses.push({mask:Uint8Array.from(lum,v=>bright?v>threshold:v<threshold),name:(bright?'bright-':'dark-')+fraction});}
 const candidates=[];
 function scoreQuad(q,method){
   const quad=q.map(v=>({x:v.x/w,y:v.y/h}));if(!validQuad(quad))return;
   const supports=[],outsideSpread=[],content=[],texture=[],clearToSubject=[];
   for(let side=0;side<4;side++){
    const a=q[side],b=q[(side+1)%4],l=Math.hypot(b.x-a.x,b.y-a.y),nx=(a.y-b.y)/l,ny=(b.x-a.x)/l,outer=[],inner=[];let supported=0,subject=0;
    for(let t=0;t<31;t++){const f=.05+.90*t/30,x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,o=at(x-nx*3,y-ny*3),inside=at(x+nx*3,y+ny*3);outer.push(o);inner.push(inside);if(distance(o,inside)>.035)supported++;if(!prototypes.length||prototypes.every(b=>distance(inside,b)>.035))subject++;}
    const center=[0,1,2].map(c=>quant(outer.map(v=>v[c]),.5));outsideSpread.push(quant(outer.map(v=>distance(v,center)),.75));supports.push(supported/31);content.push(subject/31);
    const ic=[0,1,2].map(c=>quant(inner.map(v=>v[c]),.5));texture.push(Math.min(1,quant(inner.map(v=>distance(v,ic)),.75)/.06));
    clearToSubject.push(quant(outer.map((v,i)=>v[0]-inner[i][0]),.5)>.025);
   }
   // A holder -> uniform clear-film transition is the OUTER film edge, not
   // the photograph. Clear-film -> denser subject or textured subject beside
   // a holder provides independent evidence for the photographic boundary.
   const strong=supports.filter((v,i)=>v>=.65&&content[i]>=.6&&(texture[i]>.25||clearToSubject[i])).length;if(strong<3)return;
   const uniform=outsideSpread.reduce((s,v)=>s+Math.max(0,1-v/.12),0)/4,score=supports.reduce((s,v,i)=>s+v*Math.min(1,content[i]/.7),0)/4*.60+uniform*.20+texture.reduce((s,v)=>s+v,0)/4*.20;
   candidates.push({quad,region:bounds(quad),score,supports,content,texture,clearToSubject,strong,uniform,method,detectorSize:{width:w,height:h}});
 }
 for(const hypothesis of strategy==='lines'?[]:hypotheses){
  const mask=close(hypothesis.mask,w,h);
  for(const component of components(mask,w,h)){
   if(component.touch)continue;
   const q=fit(component.boundary);if(!q)continue;
   if(area(hull(component.boundary))/Math.max(1,area(q))<.82)continue;
   scoreQuad(q,hypothesis.name);
  }
 }
 if(strategy!=='contours')for(const q of edgeQuads(colors,w,h))scoreQuad(q,'gradient-lines');
 const similarity=(a,b)=>{const aa=area(a.quad),bb=area(b.quad),r=a.region,s=b.region,overlap=Math.max(0,Math.min(r.x+r.w,s.x+s.w)-Math.max(r.x,s.x))*Math.max(0,Math.min(r.y+r.h,s.y+s.h)-Math.max(r.y,s.y));return Math.min(aa,bb)/Math.max(aa,bb)>.88&&overlap/Math.min(r.w*r.h,s.w*s.h)>.94;};
 const groups=[];for(const c of candidates){let g=groups.find(g=>similarity(g.best,c));if(!g){g={best:c,votes:new Set()};groups.push(g);}g.votes.add(c.method);if(c.score>g.best.score)g.best=c;}
 const rank=g=>g.best.score+Math.sqrt(area(g.best.quad))*.12+Math.min(3,g.votes.size)*.015;
 groups.sort((a,b)=>rank(b)-rank(a));
 const credible=(c,votes)=>c.strong===4&&c.score>=.85&&(votes>=2||c.method==='gradient-lines'&&c.uniform>.85);let eligible=groups,agreement=null;
 // Compare supported hypotheses, not just the two winning rectangles. A noisy
 // outer film edge must not veto a stable inner photographic boundary.
 if(verify&&limit>360&&groups.some(g=>credible(g.best,g.votes.size))){
  const coarse=detect(im,{limit:320,verify:false,strategy,debug:true}),supported=coarse.candidates.filter(c=>credible(c,c.votes));
  eligible=groups.filter(g=>credible(g.best,g.votes.size)&&supported.some(c=>g.best.quad.every(p=>c.quad.some(q=>Math.hypot((p.x-q.x)*w,(p.y-q.y)*h)<Math.max(4,Math.hypot(w,h)*.012)))));agreement=eligible.length>0;
 }
 const best=eligible[0]||groups[0],competitor=eligible.find((g,i)=>i&&area(g.best.quad)>area(best.best.quad)*.5&&!g.best.quad.every(p=>contains(best.best.quad,p.x,p.y))),ambiguous=!!(best&&competitor&&rank(competitor)>rank(best)-.035);let reason=!best?'no-boundary-evidence':ambiguous?'competing-regions':best.best.strong<4?'partial-boundary':agreement===false?'scale-disagreement':'coherent-quadrilateral';
 let safe=!!best&&!ambiguous&&agreement!==false&&credible(best.best,best.votes.size);
 const c=(ambiguous?groups[0]:best)?.best;
 const analysisQuad=c?inset(c.quad,2,w,h):null;if(safe&&!analysisQuad){safe=false;reason='insufficient-resolution';}if(!safe&&reason==='coherent-quadrilateral')reason='weak-boundary-support';const confidence=safe?.84:best?.55:0;
 return {version:1,method:'frame-contours-1',region:safe?c.region:full(),proposal:c?.region||null,quad:c?.quad||null,analysisQuad,analysisSafe:safe&&!!analysisQuad,confidence,reason,coordinateSpace:'normalized-source',evidence:c?{sides:c.supports,thresholds:best.votes.size,score:c.score,backgroundModes:prototypes.length,scaleAgreement:agreement}:null,...(debug?{candidates:groups.map(g=>({...g.best,votes:g.votes.size})),detectorSize:{width:w,height:h}}:{})};
}
function validRecord(d){return !!d&&d.version===1&&d.coordinateSpace==='normalized-source'&&typeof d.analysisSafe==='boolean'&&Number.isFinite(d.confidence)&&d.confidence>=0&&d.confidence<=1&&(d.quad===null?!d.analysisSafe&&d.analysisQuad===null:validQuad(d.quad)&&(d.analysisQuad===null?!d.analysisSafe:validQuad(d.analysisQuad)&&d.analysisQuad.every(p=>contains(d.quad,p.x,p.y))))&&(!d.sourceDimensions||['width','height'].every(k=>Number.isSafeInteger(d.sourceDimensions[k])&&d.sourceDimensions[k]>0));}
function matches(d,r,im){if(!validRecord(d)||!validQuad(d.quad)||!validQuad(d.analysisQuad)||!r)return false;const b=bounds(d.quad);return ['x','y','w','h'].every(k=>Math.abs(b[k]-r[k])<1e-8)&&(!d.sourceDimensions||!im||d.sourceDimensions.width===im.width&&d.sourceDimensions.height===im.height);}
root.NSFrameDetector=Object.freeze({detect,validQuad,validRecord,matches,contains,bounds,inset});
})(globalThis);
