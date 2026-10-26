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
function detect(im){
 const small=C.preview(im,240),old=legacyDetect(small),ps=C.sample(small,{x:0,y:0,w:1,h:1},0,22000),orange=ps.filter(p=>p[0]>p[1]*1.12&&p[1]>p[2]*1.08&&p[1]>.02);
 if(orange.length<80)return {...old,method:'edge-projection',reason:'no-film-bands'};
 const scale=[0,1,2].map(c=>C.quantile(orange.map(p=>p[c]),.97));
 function axis(horizontal){
  const n=horizontal?small.width:small.height,m=horizontal?small.height:small.width,flags=[];
  for(let k=0;k<n;k++){
   let total=0,clear=0;
   for(let j=Math.floor(m*.15);j<m*.85;j+=2){const p=C.pixel(small,horizontal?k:j,horizontal?j:k);total++;if(p[0]>p[1]*1.12&&p[1]>p[2]*1.08&&Math.min(...p.map((v,c)=>v/Math.max(1e-5,scale[c])))>.84)clear++;}
   flags[k]=clear/Math.max(1,total)>.72;
  }
  const runs=[];for(let k=0;k<n;k++)if(flags[k]){let end=k+1;while(end<n&&flags[end])end++;if(end-k>=2)runs.push({a:k,b:end});k=end;}
  const left=runs.filter(r=>r.b<n*.46).sort((a,b)=>b.b-a.b)[0],right=runs.filter(r=>r.a>n*.54).sort((a,b)=>a.a-b.a)[0];
  if(!left||!right||(right.a-left.b)/n<.32)return null;
  return {lo:(left.b+1)/n,hi:(right.a-1)/n};
 }
 const x=axis(true),y=axis(false);if(!x&&!y)return {...old,method:'edge-projection',reason:'no-enclosing-bands'};
 const r=old.region;return {region:C.rect({x:x?x.lo:r.x,y:y?y.lo:r.y,w:x?x.hi-x.lo:r.w,h:y?y.hi-y.lo:r.h}),confidence:(x&&y)? .78 : .68,method:'central-film-bands',reason:x&&y?'enclosed-frame':'check-other-axis'};
}
root.NSColorAnalysis={analyze,detect};
})(globalThis);
