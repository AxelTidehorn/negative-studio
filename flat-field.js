/* Small spatial gain map; no full-size corrected copy or channel white balance. */
(function(root){
'use strict';
const SIZE=17,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function signature(im,domain){return JSON.stringify([domain,im.width,im.height,im.encoding,im.colorSpace||'srgb']);}
function hash(f){let h=2166136261;for(const c of JSON.stringify([f.signature,f.size,f.gains])){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'ff-'+(h>>>0).toString(16);}
function valid(f){return !!(f&&f.version===1&&f.size===SIZE&&typeof f.signature==='string'&&f.signature.length<1024&&typeof f.name==='string'&&f.name.length<=250&&Array.isArray(f.gains)&&f.gains.length===SIZE*SIZE*3&&f.gains.every(v=>Number.isFinite(v)&&v>=.25&&v<=4)&&f.id===hash(f));}
function build(im,domain,name='Referens'){
 if(im.width<64||im.height<64||im.flatField)throw Error('Referensen måste vara minst 64×64 pixlar och utan korrigering.');
 const values=[],totals=[[],[],[]];let clipped=0,count=0;
 for(let gy=0;gy<SIZE;gy++)for(let gx=0;gx<SIZE;gx++){
  const sums=[0,0,0];let n=0;
  const cx=gx*(im.width-1)/(SIZE-1),cy=gy*(im.height-1)/(SIZE-1),rx=Math.max(2,im.width*.035),ry=Math.max(2,im.height*.035);
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
   const p=NSColorEngine.pixel(im,Math.round(clamp(cx+dx*rx/4,0,im.width-1)),Math.round(clamp(cy+dy*ry/4,0,im.height-1)));
   if(p.some(v=>v>=.98))clipped++;count++;for(let k=0;k<3;k++)sums[k]+=p[k];n++;
  }
  const p=sums.map(v=>v/n);if(p.some(v=>v<.005))throw Error('Referensen är för mörk. Använd en jämnt belyst bild utan film.');
  values.push(p);p.forEach((v,k)=>totals[k].push(v));
 }
 if(clipped/count>.002)throw Error('Referensen har klippta ljusa partier. Sänk exponeringen.');
 const median=totals.map(a=>NSColorEngine.quantile(a,.5));
 const gains=values.flatMap(p=>p.map((v,k)=>median[k]/v));
 if(gains.some(v=>v<.25||v>4))throw Error('Referensen varierar för mycket för säker korrigering.');
 const f={version:1,size:SIZE,signature:signature(im,domain),name:String(name).slice(0,250),gains};f.id=hash(f);return f;
}
function gain(f,x,y,w,h,k){const u=x/Math.max(1,w-1)*(f.size-1),v=y/Math.max(1,h-1)*(f.size-1),x0=Math.floor(u),y0=Math.floor(v),x1=Math.min(f.size-1,x0+1),y1=Math.min(f.size-1,y0+1),a=u-x0,b=v-y0;const at=(xx,yy)=>f.gains[(yy*f.size+xx)*3+k];return (at(x0,y0)*(1-a)+at(x1,y0)*a)*(1-b)+(at(x0,y1)*(1-a)+at(x1,y1)*a)*b;}
function region(im,cx=.5,cy=.5,size=320){const width=Math.min(size,im.width),height=Math.min(size,im.height),x0=clamp(Math.round(cx*im.width-width/2),0,im.width-width),y0=clamp(Math.round(cy*im.height-height/2),0,im.height-height),data=new Float32Array(width*height*3);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(NSColorEngine.pixel(im,x0+x,y0+y),(y*width+x)*3);return {width,height,data,channels:3,scale:1,encoding:'linear',colorSpace:im.colorSpace||'srgb',x0,y0};}
root.NSFlatField={signature,build,valid,gain,region};
})(globalThis);
