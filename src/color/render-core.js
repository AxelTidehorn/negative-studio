/* Shared, DOM-free pixel path for interactive preview and 16-bit export. */
(function(root){
'use strict';
const clamp=v=>Math.max(0,Math.min(1,v));
const colorVariant4=value=>value==='original'||value==='robust'?value:'legacy';
// Experimental color-confidence knee in source transmission, not display white.
// These are bounded experimental normalized signal thresholds, not a measured camera noise model.
// Express the bounds in the unchanged calibrated coordinates so every LUT/export
// path can use the same RGB-coupled stage without extra source reads or logarithms.
function lowSignal4(c){
 const a=c.cal.beta4,r=a.response;
 const coordinate=(v,k)=>(-Math.log10(v*a.light[k]/a.base[k])-r.offset[k])/r.span[k];
 const start=[0,1,2].map(k=>coordinate(64/65535,k));
 return {start,invRange:start.map((v,k)=>1/(coordinate(4/65535,k)-v)),strength:.85,robustStrength:.5};
}
function compile(c){
 if(root.NSEditing2?.version(c.opts.editVersion)===2){
  const base=compile({...c,opts:{...c.opts,...NSEditing2.neutral}}),edit=NSEditing2.compile(c.opts,!!c.monochrome);
  if(edit.parameters.identity){base.editIdentity=true;return base;}
  return {technical:base.technical,finish:p=>edit.pixel(base.finish(p)),pixel:p=>edit.pixel(base.pixel(p))};
 }
 if(!['calibrated4','v2'].includes(c.kind))throw Error('UNSUPPORTED_CONVERSION_ENGINE');
 const o=c.opts,look=NSProfiles.compile(c.look,!!c.monochrome),parameters=NSColorParameters.prepare(c),ev=parameters.exposureGain,
 gains=parameters.gains,invGamma=parameters.inverseGamma,range=parameters.displayRange,sat=parameters.saturation,
 variant=colorVariant4(o.colorMode4),confidence=c.kind==='calibrated4'&&variant!=='original'?lowSignal4(c):null,
 lowStart=confidence?.start,
 knee=variant==='robust'&&confidence?confidence.invRange.map(v=>1/v/(o.autoLevels?c.cal.beta4.span:1)):null,
 kneeStart=knee?lowStart.map(v=>Math.max(0,o.autoLevels?(v-c.cal.beta4.lo)/c.cal.beta4.span:v)):null;
 function softDensity4(x,k){const d=Math.max(0,x-kneeStart[k]);return x-d-knee[k]*Math.expm1(-d/knee[k]);}
 function technical(v,k){
  if(c.kind==='calibrated4'){
   const a=c.cal.beta4,r=a.response;
   return (-Math.log10(Math.max(1/65535,v)*a.light[k]/a.base[k])-r.offset[k])/r.span[k];
  }
  throw Error('UNSUPPORTED_CONVERSION_ENGINE');
 }
 const encode=v=>{v=clamp(v);return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;};
 const black4=parameters.black,whiteRange4=parameters.whiteRange;
 function finish4(p){
  const a=c.cal.beta4;
  // Keep signed density coordinates until the shared range has been applied.
  let r=Math.max(0,o.autoLevels?(p[0]-a.lo)/a.span:p[0]),
      g=Math.max(0,o.autoLevels?(p[1]-a.lo)/a.span:p[1]),
      b=Math.max(0,o.autoLevels?(p[2]-a.lo)/a.span:p[2]);
  if(confidence&&(p[0]>lowStart[0]||p[1]>lowStart[1]||p[2]>lowStart[2])){
   const t=clamp(Math.max((p[0]-confidence.start[0])*confidence.invRange[0],(p[1]-confidence.start[1])*confidence.invRange[1],(p[2]-confidence.start[2])*confidence.invRange[2]));
   if(t>0){
    const fade=t*t*(3-2*t),wide=c.workingSpace==='rec2020',neutral=wide?.2627*r+.678*g+.0593*b:.2126*r+.7152*g+.0722*b;
    if(variant==='robust'){
     // Bound density-channel deviations before tone rendering. Centering the
     // soft response on the same neutral preserves calibrated neutral values.
     let dr=softDensity4(r,0)-softDensity4(neutral,0),dg=softDensity4(g,1)-softDensity4(neutral,1),db=softDensity4(b,2)-softDensity4(neutral,2);
     const mean=wide?.2627*dr+.678*dg+.0593*db:.2126*dr+.7152*dg+.0722*db;dr-=mean;dg-=mean;db-=mean;
     const minimum=neutral+Math.min(dr,dg,db),s=minimum<0?neutral/Math.max(1e-12,neutral-minimum):1,w=confidence.robustStrength*fade;
     r+=w*(neutral+dr*s-r);g+=w*(neutral+dg*s-g);b+=w*(neutral+db*s-b);
    }else{
     // Preserve the merged #22 result, including its operation order.
     const w=confidence.strength*t*t*(3-2*t);r+=w*(neutral-r);g+=w*(neutral-g);b+=w*(neutral-b);
    }
   }
  }
  r=r*ev*gains[0];g=g*ev*gains[1];b=b*ev*gains[2];
  let y=c.workingSpace==='rec2020'?.2627*r+.678*g+.0593*b:.2126*r+.7152*g+.0722*b;
  if(y>1e-12){
   let target=Math.max(0,(y-black4)/whiteRange4);
   if(o.gamma!==1)target=target**invGamma;
   if(o.contrast!==1)target=.18*(target/.18)**o.contrast;
   if(o.shadows||o.highlights){const displayY=encode(target),sw=(1-clamp(displayY/.65))**2,hw=clamp((displayY-.35)/.65)**2;target*=2**(-(o.shadows/100)*sw*1.4+(o.highlights/100)*hw*1.4);}
   r=r*target/y;g=g*target/y;b=b*target/y;
  }
  if(c.workingSpace==='rec2020'){const q=NSRawInput.matrix.map(m=>m[0]*r+m[1]*g+m[2]*b);const l=Math.max(0,.2126*q[0]+.7152*q[1]+.0722*q[2]),minimum=Math.min(...q),s=minimum<0?l/Math.max(1e-12,l-minimum):1;[r,g,b]=q.map(v=>Math.max(0,l+(v-l)*s));}
  if(sat!==1){y=.2126*r+.7152*g+.0722*b;r=Math.max(0,y+(r-y)*sat);g=Math.max(0,y+(g-y)*sat);b=Math.max(0,y+(b-y)*sat);}
  const peak=Math.max(r,g,b),mapped=o.toneMode4==='reference'?Math.min(1,peak):peak<=.8?peak:.8+.2*(-Math.expm1(-Math.min(100,(peak-.8)/.2)));
  if(peak>0){r=r*mapped/peak;g=g*mapped/peak;b=b*mapped/peak;}
  p=[encode(r),encode(g),encode(b)];
  p=look.pixel(p);
  return p;
 }
 if(c.kind==='v2'){
  NSV2Platform.validate(c.v2);
  const k=NSV2Fast.compile(NSConversionV2.compile(c.v2.source,c.v2.base,c.v2.calibration),c.v2.intent),out=new Float64Array(3);
  // Fixed RGB arity avoids Array.from's typed-array iterator/callback per pixel.
  function pixel(p){if(!c.v2Positive){k.pixel(p[0],p[1],p[2],out);p=[NSV2Render.encode(out[0]),NSV2Render.encode(out[1]),NSV2Render.encode(out[2])];}
   p=look.pixel(p);return p;
  }
  return {technical:v=>v,finish:pixel,pixel};
 }
 function pixel(p){return finish4([technical(p[0],0),technical(p[1],1),technical(p[2],2)]);}
 return {technical,finish:finish4,pixel};
}
// Cache only the separable technical stage. Creative mixing and tonal zones remain exact.
function tables(kernel){const a=[new Float64Array(65536),new Float64Array(65536),new Float64Array(65536)];for(let k=0;k<3;k++)for(let i=0;i<65536;i++)a[k][i]=kernel.technical(i/65535,k);return a;}
let renderCache=null,technicalRenderCache4=null;
function cachedRender(config){const key=JSON.stringify(config);if(!renderCache||renderCache.key!==key){const kernel=compile(config);let technical=null;if(config.kind==='calibrated4'){const a=config.cal.beta4,tkey=JSON.stringify([a.response.offset,a.response.span,a.base,a.light]);if(!technicalRenderCache4||technicalRenderCache4.key!==tkey)technicalRenderCache4={key:tkey,table:tables(kernel)};technical=technicalRenderCache4.table;}renderCache={key,kernel,technical};}return renderCache;}
function lookup(t,v,c){const u=clamp(v)*65535,a=Math.floor(u),b=Math.min(65535,a+1);return t[c][a]+(t[c][b]-t[c][a])*(u-a);}
function read(im,i,x,y,v2=false){if(v2)return NSV2Platform.read(im,i,x,y);if(im.flatField){const n=i/im.channels,s=im.scale||1;return NSColorEngine.linearPixel(im,[im.data[i]/s,im.data[i+1]/s,im.data[i+2]/s],x??n%im.width,y??Math.floor(n/im.width));}const d=im.data,s=im.scale||1,p=[d[i]/s,d[i+1]/s,d[i+2]/s];if(im.encoding==='srgb')return p.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return p.map(v=>clamp(v/(im.normalization||1)));}
// One bounded positive preview cache per renderer. Edits/profiles reuse inversion.
let v2PreviewCache=null,v2PreviewConversions=0,v2PreviewAdoptions=0,v2PreviewReconstructionMs=0;
// Pixel dependencies only: creative edits, geometry and metadata-only intent IDs
// never change the positive source. Source owners increment previewRevision.
function v2PreviewKey(im,c){const r=c.v2,t=r.intent;return JSON.stringify({image:{revision:im.previewRevision,width:im.width,height:im.height,channels:im.channels,encoding:im.encoding,colorSpace:im.colorSpace,scale:im.scale,normalization:im.normalization,flatField:im.flatField},source:r.source,base:{rgb:r.base.rgb,domain:r.base.domain},calibration:r.calibration,intent:{algorithmVersion:t.algorithmVersion,output:t.output,tone:t.tone,toneRecipe:t.toneRecipe,photographic:t.photographic,exposure:t.exposure,colorCorrection:t.colorCorrection}});}
const positiveImage=(im,data)=>({width:im.width,height:im.height,channels:3,scale:1,normalization:1,encoding:'srgb',colorSpace:'srgb',data});
function cachedV2Positive(im,c){return v2PreviewCache?.source===im&&v2PreviewCache.key===v2PreviewKey(im,c)&&v2PreviewCache.data.byteLength?positiveImage(im,v2PreviewCache.data):null;}
function installV2Positive(im,c,data){
 if(!(data instanceof Float32Array)||data.length!==im.width*im.height*3||im.width*im.height>2000000)throw Error('V2_POSITIVE_CACHE_INVALID');
 v2PreviewCache={source:im,key:v2PreviewKey(im,c),data};v2PreviewAdoptions++;return positiveImage(im,data);
}
function v2PositivePreview(im,config,cache=true){
 if(im.width*im.height>2000000)return null;
 const saved=cache&&cachedV2Positive(im,config);if(saved)return saved.data;
 const started=globalThis.performance?.now?.()||0,fast=NSV2Fast.compile(NSConversionV2.compile(config.v2.source,config.v2.base,config.v2.calibration),config.v2.intent),data=new Float32Array(im.width*im.height*3),out=new Float64Array(3);
 for(let i=0;i<data.length;i+=3){const p=NSV2Platform.read(im,i);fast.pixel(p[0],p[1],p[2],out);for(let c=0;c<3;c++)data[i+c]=NSV2Render.encode(out[c]);}
 if(cache){v2PreviewCache={source:im,key:v2PreviewKey(im,config),data};v2PreviewConversions++;v2PreviewReconstructionMs=(globalThis.performance?.now?.()||0)-started;}return data;
}
function v2PositiveImage(im,c,{cache=true}={}){const data=v2PositivePreview(im,c,cache);if(!data)throw Error('V2_POSITIVE_PREVIEW_LIMIT');return positiveImage(im,data);}

function render(im,config,mode='positive',limit=1400,cache){
 const positive=config.kind==='v2'&&mode!=='negative'?v2PositivePreview(im,config):null;if(config.kind!=='v2')v2PreviewCache=null;
 const cached=cachedRender(positive?{...config,v2Positive:true}:config),kernel=cached.kernel,technical=cached.technical,s=Math.min(1,limit/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s)),data=new Uint8ClampedArray(w*h*4),bins=new Uint32Array(256),histogram={red:new Uint32Array(256),green:new Uint32Array(256),blue:new Uint32Array(256),luminance:bins,samples:0};
 const encode=v=>{v=clamp(v);return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(im.width-1,Math.floor((x+.5)*im.width/w)),sy=Math.min(im.height-1,Math.floor((y+.5)*im.height/h)),j=(sy*im.width+sx)*im.channels,p=read(im,j,undefined,undefined,config.kind==='v2'),q=mode==='negative'||mode==='split'&&x<w/2?(config.workingSpace==='rec2020'?NSRawInput.displayLinear(p):p).map(encode):technical?kernel.finish(p.map((v,k)=>lookup(technical,v,k))):kernel.pixel(positive?Array.from(positive.subarray(j,j+3)):p),i=(y*w+x)*4;for(let k=0;k<3;k++)data[i+k]=Math.round(q[k]*255);data[i+3]=255;if((y*w+x)%Math.max(1,Math.floor(w*h/25000))===0){bins[Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])]++;histogram.red[data[i]]++;histogram.green[data[i+1]]++;histogram.blue[data[i+2]]++;histogram.samples++;}}
 return {width:w,height:h,data,bins,histogram};
}
// Compile once per export. Integer source tables include sRGB decoding and the
// technical stage; RGB-coupled tones/profiles remain evaluated without approximation.
function prepare(im,config){
 const kernel=compile(config),integer=config.kind!=='v2'&&!im.flatField&&(im.scale===255||im.scale===65535)&&im.data.BYTES_PER_ELEMENT<=2;
 let table=null;
 if(integer){
  const n=im.scale+1;table=[new Float64Array(n),new Float64Array(n),new Float64Array(n)];
  for(let v=0;v<n;v++){
   let value=v/im.scale;
   if(im.encoding==='srgb')value=value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
   else value=clamp(value/(im.normalization||1));
   for(let c=0;c<3;c++)table[c][v]=kernel.technical(value,c);
  }
 }
 return {pixel(i,x,y){return table?kernel.finish([table[0][im.data[i]],table[1][im.data[i+1]],table[2][im.data[i+2]]]):kernel.pixel(read(im,i,x,y,config.kind==='v2'));}};
}
function exportRows(im,config,geometry,y0,rows,prepared){
 const k=prepared?null:compile(config),out=new Uint16Array(geometry.width*rows*3);
 for(let y=0;y<rows;y++)for(let x=0;x<geometry.width;x++){
  const [sx,sy]=geometry.at(x,y0+y),j=(sy*im.width+sx)*im.channels,i=(y*geometry.width+x)*3;
  const p=prepared?prepared.pixel(j):k.pixel(read(im,j,undefined,undefined,config.kind==='v2'));
  for(let c=0;c<3;c++)out[i+c]=Math.round(p[c]*65535);
 }
 return out;
}
root.NSPixelKernel={compile,tables,render,exportRows,prepare,lowSignal4,colorVariant4,v2PreviewKey,v2PositiveImage,cachedV2Positive,installV2Positive,clearV2Positive:()=>{v2PreviewCache=null;},v2PreviewMetrics:()=>({conversions:v2PreviewConversions,adoptions:v2PreviewAdoptions,reconstructionMs:v2PreviewReconstructionMs,bytes:v2PreviewCache?.data.byteLength||0})};
})(globalThis);
