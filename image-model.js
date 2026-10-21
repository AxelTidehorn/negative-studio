/* Negative Studio Beta 2. Pure functions; input RGB is normalized, tagged sRGB or linear sRGB. */
(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const median=a=>quantile(a,.5);
function quantile(a,q){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(q*(b.length-1)))];}
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const encode=v=>{v=clamp(v);return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;};
function rect(r={x:0,y:0,w:1,h:1}){
 const eps=1e-12,x=clamp(Number(r.x)||0,0,1-eps),y=clamp(Number(r.y)||0,0,1-eps);
 return {x,y,w:clamp(Number(r.w)||eps,eps,1-x),h:clamp(Number(r.h)||eps,eps,1-y)};
}
function bounds(im,r,margin=0){r=rect(r);return {x0:Math.min(im.width-1,Math.ceil((r.x+r.w*margin)*im.width)),y0:Math.min(im.height-1,Math.ceil((r.y+r.h*margin)*im.height)),x1:Math.min(im.width,Math.max(Math.min(im.width-1,Math.ceil((r.x+r.w*margin)*im.width))+1,Math.floor((r.x+r.w*(1-margin))*im.width))),y1:Math.min(im.height,Math.max(Math.min(im.height-1,Math.ceil((r.y+r.h*margin)*im.height))+1,Math.floor((r.y+r.h*(1-margin))*im.height)))};}
function pixel(im,x,y){const i=(y*im.width+x)*(im.channels||3),s=im.scale||1;
 const input=[0,1,2].map(c=>im.data[i+c]/s);
 // Keep wide-gamut TIFF values until a common, channel-independent normalization
 // has been applied. Per-channel clipping here destroys orange-mask information.
 const linear=im.encoding==='icc'?im.profile.toLinear(input):im.encoding==='linear'?input:input.map(decode);
 return linear.map(v=>clamp(v/(im.normalization||1)));
}
function sample(im,r,margin=.012,limit=24000){const b=bounds(im,r,margin),out=[],step=Math.max(1,Math.ceil(Math.sqrt((b.x1-b.x0)*(b.y1-b.y0)/limit)));for(let y=b.y0;y<b.y1;y+=step)for(let x=b.x0;x<b.x1;x+=step)out.push(pixel(im,x,y));return out;}
function preview(im,limit=1400){const s=Math.min(1,limit/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s)),data=new Float32Array(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=pixel(im,Math.min(im.width-1,Math.floor((x+.5)*im.width/w)),Math.min(im.height-1,Math.floor((y+.5)*im.height/h)));data.set(p,(y*w+x)*3);}return {width:w,height:h,data,channels:3,scale:1,encoding:'linear'};}
function detectFrame(im){
 const g=preview(im,180),w=g.width,h=g.height;
 function axis(horizontal){const n=horizontal?w:h,m=horizontal?h:w,scores=new Array(n).fill(0);for(let k=2;k<n-2;k++){const ds=[];for(let j=Math.floor(m*.08);j<m*.92;j+=2){const a=pixel(g,horizontal?k-2:j,horizontal?j:k-2),b=pixel(g,horizontal?k+2:j,horizontal?j:k+2);ds.push(Math.max(...a.map((v,c)=>Math.abs(v-b[c]))));}scores[k]=quantile(ds,.6);}
 const floor=quantile(scores,.65),candidates=[];for(let k=3;k<n-3;k++)if(scores[k]>.025&&scores[k]>floor*1.7&&scores[k]>=scores[k-1]&&scores[k]>=scores[k+1])candidates.push(k);
 let best=null;for(const a of candidates)for(const b of candidates){const span=(b-a)/n;if(span<.32||a>n*.48||b<n*.52)continue;const strength=(scores[a]+scores[b])/2;const value=strength*(.7+span)-Math.abs((a+b)/(2*n)-.5)*.08;if(!best||value>best.value)best={a,b,value,strength};}
 return best?{lo:(best.a+1)/n,hi:(best.b-1)/n,confidence:clamp(best.strength*3,0,.95)}:{lo:.02,hi:.98,confidence:0};}
 const x=axis(true),y=axis(false);return {region:rect({x:x.lo,y:y.lo,w:x.hi-x.lo,h:y.hi-y.lo}),confidence:Math.min(.65,x.confidence,y.confidence),method:'edge-projection'};
}
function normalizeBase(p){const m=Math.max(...p);return p.map(v=>v/Math.max(1e-8,m));}
// Accept only orange, non-clipped, locally uniform pixels in a narrow outside band.
// The scene itself and neutral illuminated holder are never automatic base samples.
function findBase(im,r){const b=bounds(im,r),pad=Math.max(2,Math.round(Math.min(im.width,im.height)*.025)),candidates=[];
 const step=Math.max(1,Math.ceil(Math.sqrt(im.width*im.height/16000)));
 for(let y=Math.max(1,b.y0-pad);y<Math.min(im.height-1,b.y1+pad);y+=step)for(let x=Math.max(1,b.x0-pad);x<Math.min(im.width-1,b.x1+pad);x+=step){if(x>=b.x0&&x<b.x1&&y>=b.y0&&y<b.y1)continue;const p=pixel(im,x,y);if(Math.max(...p)>.985||Math.min(...p)<.007||p[0]<p[1]*1.12||p[1]<p[2]*1.08)continue;const neighbours=[pixel(im,x-1,y),pixel(im,x+1,y),pixel(im,x,y-1),pixel(im,x,y+1)];if(neighbours.some(a=>a.some((v,c)=>Math.abs(v-p[c])>Math.max(.012,p[c]*.06))))continue;candidates.push(p);}
 if(candidates.length<24)return null;
 const threshold=quantile(candidates.map(v=>v[0]),.65),top=candidates.filter(p=>p[0]>=threshold);const p=[0,1,2].map(c=>median(top.map(v=>v[c]))),shape=normalizeBase(p);
 // Clear film must transmit at least as much as the upper motif percentile in EVERY channel.
 const interior=sample(im,r,.02,4000);if(p.some((v,c)=>v<quantile(interior.map(q=>q[c]),.99)*.97))return null;
 const deviation=median(top.map(v=>Math.max(...normalizeBase(v).map((x,c)=>Math.abs(x-shape[c])))));
 if(deviation>.045)return null;return {shape,measured:p,kind:'auto-edge',confidence:clamp(1-deviation*10,0,.9),samples:top.length};
}
function analyze(im,region,options={}){
 const pixels=sample(im,region),light=options.light||[1,1,1],correct=p=>p.map((v,c)=>Math.max(1e-8,v*light[c]));
 const edge=options.noBase?null:(options.base||findBase(im,region));
 const corrected=pixels.map(correct);if(corrected.length<4)throw Error('Filmrutan är för liten för analys.');
 const baseShape=edge?normalizeBase(edge.shape.map((v,c)=>v*light[c])):normalizeBase([0,1,2].map(c=>quantile(corrected.map(p=>p[c]),.995)));
 // Same exposure scale for all channels. It cancels scan exposure without stretching colors individually.
 const exposure=quantile(corrected.map(p=>Math.max(...p.map((v,c)=>v/Math.max(1e-8,baseShape[c])))),.99);
 const densities=corrected.map(p=>density(p,baseShape,exposure));
 const lum=densities.map(d=>.2126*d[0]+.7152*d[1]+.0722*d[2]);
 const lo=quantile(lum,.015),hi=quantile(lum,.985),span=Math.max(.08,hi-lo);
 // No grey-world average, channel-range matching, or permanent tint offsets.
 const clipped=pixels.filter(p=>p.some(v=>v>=.995||v<=1/65535)).length/pixels.length;
 return {version:2,baseShape,exposure,light:[...light],lo,hi,span,balance:[0,0,0],base:edge||{kind:'fallback',confidence:0},count:pixels.length,clipped,channelRange:[0,1,2].map(c=>[quantile(densities.map(p=>p[c]),.015),quantile(densities.map(p=>p[c]),.985)]),region:rect(region)};
}
function density(p,shape,exposure){return p.map((v,c)=>-Math.log10(Math.max(1e-8,v/Math.max(1e-8,shape[c]*exposure))));}
function positive(p,cal,auto=true,strength=1){const d=density(p.map((v,c)=>v*cal.light[c]),cal.baseShape,cal.exposure);return d.map((v,c)=>{const u=auto?(v-cal.lo-(cal.balance[c]||0)*strength)/cal.span:v;return clamp(Math.expm1(clamp(u)*1.6)/Math.expm1(1.6));});}
function sampleBase(im,x,y){const p=[],cx=Math.min(im.width-1,Math.floor(clamp(x)*im.width)),cy=Math.min(im.height-1,Math.floor(clamp(y)*im.height));for(let yy=Math.max(0,cy-3);yy<=Math.min(im.height-1,cy+3);yy++)for(let xx=Math.max(0,cx-3);xx<=Math.min(im.width-1,cx+3);xx++)p.push(pixel(im,xx,yy));const measured=[0,1,2].map(c=>median(p.map(v=>v[c])));if(Math.min(...measured)<1e-5||Math.max(...measured)>.995)throw Error('Filmbasprovet är klippt eller för mörkt. Välj en annan yta.');return {shape:normalizeBase(measured),measured,kind:'manual',confidence:1};}
function exportGeometry(im,region,crop,rotation=0){const b=crop?bounds(im,region):{x0:0,y0:0,x1:im.width,y1:im.height},sw=b.x1-b.x0,sh=b.y1-b.y0,rot=((rotation%360)+360)%360;return {width:rot%180?sh:sw,height:rot%180?sw:sh,at(x,y){return [b.x0+(rot===90?y:rot===180?sw-1-x:rot===270?sw-1-y:x),b.y0+(rot===90?sh-1-x:rot===180?sh-1-y:rot===270?x:y)];}};}
root.NSColorEngine={clamp,decode,encode,rect,bounds,pixel,sample,preview,detectFrame,findBase,analyze,positive,sampleBase,exportGeometry,quantile,normalizeBase};
})(globalThis);
