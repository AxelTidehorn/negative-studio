/* Beta 4: persistent channel calibration, independently reanalysed common tone. */
(function(root){
'use strict';
const C=root.NSColorEngine,EPS=1/65535,weights=[.2126,.7152,.0722];
const triplet=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
function valid(r){return !!(r&&r.version===4&&triplet(r.offset)&&triplet(r.span)&&r.span.every(v=>v>.01&&v<10)&&triplet(r.base)&&r.base.every(v=>v>0&&v<=1)&&triplet(r.light)&&r.light.every(v=>v>0&&v<100)&&typeof r.domain==='string'&&['estimated','two-neutral'].includes(r.kind));}
function density(p,base,light){return p.map((v,k)=>-Math.log10(Math.max(EPS,v)*light[k]/base[k]));}
function estimate(im,region,{base=[1,1,1],light=[1,1,1],domain='linear-srgb'}={}){
 const s=root.NSColorAnalysis.analyze(im,region),b=base.map(v=>Math.max(EPS,v)),l=[...light];
 return {version:4,kind:'estimated',domain,base:b,light:l,offset:s.lo.map((v,k)=>v+Math.log10(b[k]/l[k])),span:[...s.spans],region:C.rect(region)};
}
function coordinate(p,r,base=r.base,light=r.light){return density(p,base,light).map((v,k)=>(v-r.offset[k])/r.span[k]);}
function analyze(im,region,r,{base=r.base,light=r.light}={}){
 const ps=C.sample(im,region,.018,24000),values=ps.map(p=>coordinate(p,r,base,light)),lum=values.map(p=>p.reduce((v,x,k)=>v+x*weights[k],0));
 // A common affine range changes brightness/contrast, never three channel slopes.
 const lo=C.quantile(lum,.015),hi=C.quantile(lum,.985);
 return {version:4,response:r,base:[...base],light:[...light],lo,span:Math.max(.15,hi-lo),count:ps.length,weak:hi-lo<.15,clipped:[0,1,2].map(k=>ps.filter(p=>p[k]>=.995).length/ps.length)};
}
function fitNeutral(r,a,b){
 if(!valid(r)||![a,b].every(p=>triplet(p)&&p.every(x=>x>EPS*4&&x<.98)))throw Error('Välj två neutrala ytor utan klippta eller mycket mörka källvärden.');
 const da=density(a,r.base,r.light),db=density(b,r.base,r.light),delta=da.map((x,k)=>db[k]-x);
 if(delta.some(x=>Math.abs(x)<.08)||delta.some(x=>x*delta[1]<=0))throw Error('Ytorna måste vara neutrala och skilja tydligt i ljushet.');
 const slope=delta.map(v=>Math.abs(v/delta[1])*r.span[1]);
 if(slope.some(v=>v<.03||v>8))throw Error('Proven ger en osäker kanalrespons. Välj andra neutrala ytor.');
 const common=coordinate(a,r).reduce((s,v)=>s+v,0)/3;
 return {...r,kind:'two-neutral',offset:da.map((v,k)=>v-slope[k]*common),span:slope,neutralSamples:[a.slice(),b.slice()]};
}
root.NSColorCalibration={valid,estimate,coordinate,analyze,fitNeutral};
})(globalThis);
