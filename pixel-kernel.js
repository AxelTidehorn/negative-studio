/* Shared, DOM-free pixel path for interactive preview and 16-bit export. */
(function(root){
'use strict';
const clamp=v=>Math.max(0,Math.min(1,v));
function compile(c){
 const o=c.opts,f=c.profile,print=c.print,bw=f.type==='bw',ev=2**o.exposure,
 gains=bw?[1,1,1]:[Math.exp(o.temperature/180+o.tint/350),Math.exp(-o.tint/120),Math.exp(-o.temperature/180+o.tint/350)],
 invGamma=1/Math.max(.25,o.gamma),range=Math.max(.1,o.highlight-o.shadow),sat=bw?0:o.saturation;
 function technical(v,k){
  if(c.kind==='beta2'||c.kind==='density38'){
   const cal=c.cal,d=-Math.log10(Math.max(1e-8,v*cal.light[k]/Math.max(1e-8,cal.baseShape[k]*cal.exposure)))*(c.slopes?.[k]||1);
   const u=o.autoLevels?(d-cal.lo)/cal.span:d;
   return c.kind==='density38'?clamp(Math.expm1(clamp(u)*1.5)/Math.expm1(1.5)):clamp(Math.expm1(clamp(u)*1.6)/Math.expm1(1.6));
  }
  const ratio=c.noBase?v*c.light[k]:v/Math.max(1/65535,c.base[k]);
  let q=Math.max(0,1-Math.max(1/65535,Math.min(c.kind==='reference'?1:1e8,ratio)));
  // The reference clips transmission before division, as the original did.
  if(c.kind==='reference')q=Math.max(0,1-Math.max(1/65535,Math.min(1,v*c.light[k]))/(c.noBase?1:Math.max(1/65535,c.base[k])));
  if(o.autoLevels&&c.levels){const lo=c.levels.lo[k],span=c.spans[k];q=(q-lo)/c.ref+((q-lo)/span-(q-lo)/c.ref)*o.balanceStrength;}
  return q;
 }
 function emulsion(p){
  if(bw){const g=clamp(.2126*p[0]+.7152*p[1]+.0722*p[2]),v=clamp(g**(1/Math.max(.7,f.bwCurve||1))+(f.bwLift||0));return [v,v,v];}
  const m=f.matrix||[[1,0,0],[0,1,0],[0,0,1]];let q=m.map(r=>clamp(r[0]*p[0]+r[1]*p[1]+r[2]*p[2]));
  let l=.2126*q[0]+.7152*q[1]+.0722*q[2];q=q.map((v,k)=>clamp(v+(v-l)*(f.mix||0))**(1/(f.gamma?.[k]||1)));
  l=.2126*q[0]+.7152*q[1]+.0722*q[2];if(f.sat&&f.sat!==1)q=q.map(v=>clamp(l+(v-l)*f.sat));
  l=.2126*q[0]+.7152*q[1]+.0722*q[2];
  if(f.shadowTint){const w=(1-l)**1.15;q=q.map((v,k)=>clamp(v*(1+((f.shadowTint[k]||1)-1)*w)));}
  if(f.highlightTint){const w=l**1.35*.75;q=q.map((v,k)=>clamp(v*(1+((f.highlightTint[k]||1)-1)*w)));}
  return q.map(v=>{v=clamp(v+(f.lift||0));if(f.shoulder)v=v/(1+f.shoulder*(1-v));if(f.toe)v=v**(1/(1+f.toe));if(f.curve&&f.curve!==1)v=v**(1/f.curve);return clamp(v);});
 }
 const encode=v=>{v=clamp(v);return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;};
 function finish(p){
  if(c.kind==='beta2'||c.kind==='density38')p=p.map(encode);
  if(bw)p=emulsion(p);else if(!c.neutralProfile&&c.strength>0){const q=emulsion(p);p=p.map((v,k)=>v+(q[k]-v)*c.strength);}
  if(!c.neutralPrint)p=p.map(v=>{v=clamp(v);if(print.shoulder)v=v/(1+print.shoulder*(1-v));return clamp(.5+(v-.5)*print.contrast);});
  p=p.map((v,k)=>{v=clamp((clamp(v)-o.shadow)/range);if(o.gamma!==1)v=v**invGamma;v=clamp(v*ev*gains[k]);return o.contrast===1?v:clamp(.5+(v-.5)*o.contrast);});
  const l=.2126*p[0]+.7152*p[1]+.0722*p[2];p=p.map(v=>clamp(l+(v-l)*sat));
  if(o.shadows||o.highlights){const l=clamp(.2126*p[0]+.7152*p[1]+.0722*p[2]),sw=(1-clamp(l/.65))**2,hw=clamp((l-.35)/.65)**2,a=-(o.shadows/100)*sw*(1-l)*.7+(o.highlights/100)*hw*l*.7;p=p.map(v=>clamp(v+a));}
  return p;
 }
 function pixel(p){if(c.kind==='reference'&&c.referenceEncoding!=='linear')p=p.map(encode);return finish([technical(p[0],0),technical(p[1],1),technical(p[2],2)]);}
 return {technical,finish,pixel};
}
// Cache only the separable technical stage. Creative mixing and tonal zones remain exact.
function tables(kernel){const a=[new Float64Array(65536),new Float64Array(65536),new Float64Array(65536)];for(let k=0;k<3;k++)for(let i=0;i<65536;i++)a[k][i]=kernel.technical(i/65535,k);return a;}
function completeTables(config,kernel){
 if(!config.neutralProfile||!config.neutralPrint||config.opts.saturation!==1||config.opts.shadows||config.opts.highlights)return null;
 const t=[new Float64Array(65536),new Float64Array(65536),new Float64Array(65536)];for(let i=0;i<65536;i++){const p=kernel.pixel([i/65535,i/65535,i/65535]);for(let c=0;c<3;c++)t[c][i]=p[c];}return t;
}
let renderCache=null;
function cachedRender(config){const key=JSON.stringify(config);if(!renderCache||renderCache.key!==key){const kernel=compile(config);renderCache={key,kernel,table:completeTables(config,kernel)};}return renderCache;}
function lookup(t,v,c){const u=clamp(v)*65535,a=Math.floor(u),b=Math.min(65535,a+1);return t[c][a]+(t[c][b]-t[c][a])*(u-a);}
function read(im,i){const d=im.data,s=im.scale||1,p=[d[i]/s,d[i+1]/s,d[i+2]/s];if(im.encoding==='srgb')return p.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return p.map(v=>clamp(v/(im.normalization||1)));}
function render(im,config,mode='positive',limit=1400,cache){
 const cached=cachedRender(config),kernel=cached.kernel,table=cached.table,s=Math.min(1,limit/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s)),data=new Uint8ClampedArray(w*h*4),bins=new Uint32Array(256);
 const encode=v=>{v=clamp(v);return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(im.width-1,Math.floor((x+.5)*im.width/w)),sy=Math.min(im.height-1,Math.floor((y+.5)*im.height/h)),j=(sy*im.width+sx)*im.channels,p=read(im,j),q=mode==='negative'||mode==='split'&&x<w/2?p.map(encode):table?[lookup(table,p[0],0),lookup(table,p[1],1),lookup(table,p[2],2)]:kernel.pixel(p),i=(y*w+x)*4;for(let k=0;k<3;k++)data[i+k]=Math.round(q[k]*255);data[i+3]=255;if((y*w+x)%Math.max(1,Math.floor(w*h/25000))===0)bins[Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])]++;}
 return {width:w,height:h,data,bins};
}
function exportRows(im,config,geometry,y0,rows,table,complete=false){
 const k=compile(config),out=new Uint16Array(geometry.width*rows*3);
 for(let y=0;y<rows;y++)for(let x=0;x<geometry.width;x++){
  const [sx,sy]=geometry.at(x,y0+y),j=(sy*im.width+sx)*im.channels,i=(y*geometry.width+x)*3;
  if(complete){out[i]=table[0][im.data[j]];out[i+1]=table[1][im.data[j+1]];out[i+2]=table[2][im.data[j+2]];continue;}
  const p=table?k.finish([table[0][im.data[j]],table[1][im.data[j+1]],table[2][im.data[j+2]]]):k.pixel(read(im,j));
  for(let c=0;c<3;c++)out[i+c]=Math.round(p[c]*65535);
 }
 return out;
}
root.NSPixelKernel={compile,tables,completeTables,render,exportRows};
})(globalThis);
