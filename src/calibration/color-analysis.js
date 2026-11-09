/* ROI statistics in log transmission. No scene-average neutralization or tint bias. */
(function(root){
'use strict';
const C=root.NSColorEngine,legacyDetect=C.detectFrame,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function quant(a,q){return a[Math.min(a.length-1,Math.floor(q*(a.length-1)))]||0;}
function analyze(im,region){
 const pixels=C.sample(im,region,.018,24000),a=[[],[],[]],clipped=[0,0,0],dark=[0,0,0];
 for(const p of pixels)for(let c=0;c<3;c++){a[c].push(-Math.log10(Math.max(1/65535,p[c])));if(p[c]>=.995)clipped[c]++;if(p[c]<=2/65535)dark[c]++;}
 for(const ch of a)ch.sort((x,y)=>x-y);
 const lo=a.map(x=>quant(x,.015)),hi=a.map(x=>quant(x,.985)),spans=hi.map((v,c)=>Math.max(.04,v-lo[c]));
 return {version:39,lo,hi,spans,count:pixels.length,clipped:clipped.map(x=>x/pixels.length),dark:dark.map(x=>x/pixels.length),weak:hi.some((v,c)=>v-lo[c]<.04),region:C.rect(region)};
}
// Trace the inner edge of clear-film bands independently on all four sides.
// Robust line fitting rejects isolated bright objects/holder reflections. A
// tilted edge yields an inscribed axis-aligned frame, never a new image rotation.
function detect(im){
 const small=C.preview(im,480),w=small.width,h=small.height;
 const ps=C.sample(small,{x:0,y:0,w:1,h:1},0,30000),orange=ps.filter(p=>p[0]>p[1]*1.12&&p[1]>p[2]*1.08&&p[1]>.02);
 const fallback=reason=>({region:{x:0,y:0,w:1,h:1},confidence:0,method:'film-boundary-traces-1',reason,edges:{},analysisSafe:false});
 if(orange.length<40){const old=legacyDetect(small);return {...fallback('no-clear-film-evidence'),region:old.confidence>.2?old.region:{x:0,y:0,w:1,h:1},confidence:Math.min(.6,old.confidence)};}
 const scale=[0,1,2].map(c=>C.quantile(orange.map(p=>p[c]),.97));
 const clear=p=>p[0]>p[1]*1.12&&p[1]>p[2]*1.08&&Math.min(...p.map((v,c)=>v/Math.max(1e-5,scale[c])))>.84;
 function side(vertical,reverse){
  const n=vertical?w:h,m=vertical?h:w,points=[];
  const read=(k,j)=>C.pixel(small,vertical?(reverse?n-1-k:k):j,vertical?j:(reverse?n-1-k:k));
  for(let t=0;t<41;t++){
   const j=Math.min(m-1,Math.round(m*(.15+.7*t/40)));let end=-1;
   for(let k=0;k<Math.floor(n*.42);k++)if(clear(read(k,j))){let e=k+1;while(e<n*.44&&clear(read(e,j)))e++;if(e<n*.42){end=e;break;}k=e;}
   if(end<0)continue;
   // A narrow dark separator belongs to the border, not the subject. A long
   // dark subject is not trimmed speculatively; it makes this trace uncertain.
   let edge=end;while(edge<end+Math.max(3,n*.012)&&Math.max(...read(edge,j).map((v,c)=>v/scale[c]))<.012)edge++;
   if(edge>=end+Math.max(3,n*.012))continue;
   const inner=read(Math.min(n-1,edge+2),j),outer=read(Math.max(0,end-1),j);
   if(Math.max(...inner.map((v,c)=>Math.abs(v-outer[c])/scale[c]))<.10)continue;
   points.push([j,reverse?n-edge:edge]);
  }
  if(points.length<29)return null;
  const slopes=[];for(let i=0;i<points.length;i++)for(let j=i+4;j<points.length;j++)slopes.push((points[j][1]-points[i][1])/(points[j][0]-points[i][0]));
  const slope=C.quantile(slopes,.5);if(Math.abs(slope)>.18)return null;
  const intercept=C.quantile(points.map(([x,y])=>y-slope*x),.5),tolerance=Math.max(1.25,n*.003),inliers=points.filter(([x,y])=>Math.abs(y-slope*x-intercept)<=tolerance);
  if(inliers.length<29||inliers.at(-1)[0]-inliers[0][0]<m*.45)return null;
  const residual=C.quantile(inliers.map(([x,y])=>Math.abs(y-slope*x-intercept)),.95);
  // One sampled pixel plus observed residual, scaled to the detector resolution.
  const pad=Math.max(1,residual),ends=[intercept,intercept+slope*(m-1)],position=(reverse?Math.min(...ends)-pad:Math.max(...ends)+pad)/n;
  return {position:clamp(position),slope,residual,coverage:inliers.length/41,marginPixels:pad};
 }
 const edges={left:side(true,false),right:side(true,true),top:side(false,false),bottom:side(false,true)},all=Object.values(edges).every(Boolean);
 const x=edges.left?.position??0,y=edges.top?.position??0,right=edges.right?.position??1,bottom=edges.bottom?.position??1;
 if(right-x<.30||bottom-y<.30)return {...fallback('inconsistent-boundaries'),edges};
 return {region:{x,y,w:right-x,h:bottom-y},confidence:all ? .82 :Math.min(.6,Object.values(edges).filter(Boolean).length*.15),method:'film-boundary-traces-1',reason:all?'four-coherent-film-boundaries':'incomplete-boundaries',edges,analysisSafe:all};
}

root.NSColorAnalysis={analyze,detect};
})(globalThis);
