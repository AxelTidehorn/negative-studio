/* ROI statistics in log transmission. No scene-average neutralization or tint bias. */
(function(root){
'use strict';
const C=root.NSColorEngine;
function quant(a,q){return a[Math.min(a.length-1,Math.floor(q*(a.length-1)))]||0;}
function analyze(im,region){
 const pixels=C.sample(im,region,.018,24000),a=[[],[],[]],clipped=[0,0,0],dark=[0,0,0];
 for(const p of pixels)for(let c=0;c<3;c++){a[c].push(-Math.log10(Math.max(1/65535,p[c])));if(p[c]>=.995)clipped[c]++;if(p[c]<=2/65535)dark[c]++;}
 for(const ch of a)ch.sort((x,y)=>x-y);
 const lo=a.map(x=>quant(x,.015)),hi=a.map(x=>quant(x,.985)),spans=hi.map((v,c)=>Math.max(.04,v-lo[c]));
 return {version:39,lo,hi,spans,count:pixels.length,clipped:clipped.map(x=>x/pixels.length),dark:dark.map(x=>x/pixels.length),weak:hi.some((v,c)=>v-lo[c]<.04),region:C.rect(region)};
}
// The shared detector returns source-space corners and a separate analysis polygon.
const detect=(im,options)=>root.NSFrameDetector.detect(im,options);

root.NSColorAnalysis={analyze,detect};
})(globalThis);
