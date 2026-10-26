/* WebGL 2 preview prototype. RGB32F source, highp math, 8-bit sRGB display.
   No half-float source quantization, float render targets or full-frame readback.
   Original calibration and CPU export remain authoritative. */
(function(root){
'use strict';
const vertex=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const fragment=`#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uSource;
uniform vec2 uSourceSize,uOutputSize;
uniform vec3 uLight,uBase,uOffset,uResponseSpan,uGains;
uniform vec3 uChromaStart,uChromaInvRange;
uniform float uChromaLimit;
uniform float uRobustStrength;
uniform int uColorVariant;
uniform float uLo,uSpan,uExposure,uBlack,uWhiteRange,uInvGamma,uContrast,uSaturation,uShadows,uHighlights,uStrength;
uniform int uMode,uAuto,uShoulder,uProfile,uPrint,uWide;
uniform mat3 uMatrix;
uniform float uTone[9],uChroma[6];
uniform vec3 uLow,uHigh,uMono;
uniform float uBwCurve,uBwLift,uPrintShoulder,uPrintContrast;
out vec4 color;
const vec3 W=vec3(.2126,.7152,.0722);
float sat(float x){return clamp(x,0.0,1.0);}
float luma(vec3 p){return dot(W,p);}
float encode(float x){x=sat(x);return x<=.0031308?12.92*x:1.055*pow(x,1.0/2.4)-.055;}
vec3 encode3(vec3 p){return vec3(encode(p.r),encode(p.g),encode(p.b));}
float curve(float y){
 const float knots[9]=float[9](0.0,.08,.18,.35,.5,.65,.8,.92,1.0);
 int k=0;for(int j=1;j<8;j++){if(y>knots[j])k=j;}
 float t=sat((y-knots[k])/(knots[k+1]-knots[k]));return mix(uTone[k],uTone[k+1],t);
}
vec3 gamut(vec3 p,float y){
 vec3 d=p-vec3(y);float s=1.0;
 for(int k=0;k<3;k++){if(d[k]>0.0)s=min(s,(1.0-y)/d[k]);else if(d[k]<0.0)s=min(s,-y/d[k]);}
 return clamp(vec3(y)+d*max(0.0,s),0.0,1.0);
}
vec3 tone(vec3 p){float y=luma(p),t=curve(y);if(y<1e-12||y>1.0-1e-12)return vec3(t);float s=min(t/y,(1.0-t)/(1.0-y));return clamp(vec3(t)+(p-vec3(y))*s,0.0,1.0);}
float hue(vec3 p){
 float hi=max(p.r,max(p.g,p.b)),lo=min(p.r,min(p.g,p.b)),d=hi-lo;
 if(d<1e-12)return 0.0;
 float h=hi==p.r?(p.g-p.b)/d:hi==p.g?2.0+(p.b-p.r)/d:4.0+(p.r-p.g)/d;
 return mod(h+6.0,6.0);
}
vec3 creative(vec3 p){
 if(uProfile==2){float gray=luma(p),v=dot(p,uMono),styled=curve(sat(v));return vec3(mix(gray,styled,sat(uStrength)));}
 if(uProfile==3){float gray=sat(luma(p));return vec3(sat(pow(gray,1.0/max(.7,uBwCurve))+uBwLift));}
 vec3 q=uMatrix*p;q=gamut(q,sat(luma(q)));
 float y=luma(q),h=hue(q);int i=int(floor(h));float t=(1.0-cos(3.141592653589793*(h-float(i))))/2.0;
 float s=mix(uChroma[i],uChroma[(i+1)%6],t);q=gamut(vec3(y)+(q-vec3(y))*s,y);q=tone(q);
 float z=luma(q),envelope=4.0*z*(1.0-z);q+=envelope*((1.0-z)*uLow+z*uHigh);return gamut(q,luma(q));
}
vec3 displayWide(vec3 p){
  vec3 q=vec3(dot(vec3(1.6604910021084345,-.5876411387885495,-.0728498633198848),p),dot(vec3(-.1245504745215907,1.13289989712596,-.0083494226043694),p),dot(vec3(-.0181507633549052,-.1005788980080074,1.1187296613629127),p));
  float l=max(0.0,luma(q)),m=min(q.r,min(q.g,q.b)),s=m<0.0?l/max(1e-12,l-m):1.0;return max(vec3(0.0),vec3(l)+(q-vec3(l))*s);
 }
vec3 softDensity(vec3 p,vec3 start,vec3 range){vec3 d=max(vec3(0.0),p-start);return p-d+range*(vec3(1.0)-exp(-d/range));}
void main(){
 // Texture row zero is the top source row; framebuffer row zero is bottom.
 vec2 pos=vec2(gl_FragCoord.x,uOutputSize.y-gl_FragCoord.y);
 ivec2 at=min(ivec2(uSourceSize)-ivec2(1),ivec2(floor(pos*uSourceSize/uOutputSize)));
 vec3 p=texelFetch(uSource,at,0).rgb;
 if(uMode==1||(uMode==2&&floor(pos.x)<uOutputSize.x/2.0)){color=vec4(encode3(uWide==1?displayWide(p):p),1.0);return;}
 p=(-log(max(vec3(1.0/65535.0),p)*uLight/uBase)/log(10.0)-uOffset)/uResponseSpan;
 vec3 density=p;
 p=max(vec3(0.0),uAuto==1?(p-vec3(uLo))/uSpan:p);
 if(uColorVariant!=1&&uProfile!=2&&uProfile!=3){
  vec3 uncertainty=(density-uChromaStart)*uChromaInvRange;
  float t=sat(max(uncertainty.r,max(uncertainty.g,uncertainty.b)));
  if(t>0.0){
   float neutral=uWide==1?dot(vec3(.2627,.678,.0593),p):luma(p);
   if(uColorVariant==2){
    float scale=uAuto==1?uSpan:1.0;vec3 start=max(vec3(0.0),(uChromaStart-vec3(uAuto==1?uLo:0.0))/scale),range=vec3(1.0)/uChromaInvRange/scale;
    vec3 d=softDensity(p,start,range)-softDensity(vec3(neutral),start,range);float mean=uWide==1?dot(vec3(.2627,.678,.0593),d):luma(d);d-=vec3(mean);
    float minimum=neutral+min(d.r,min(d.g,d.b)),s=minimum<0.0?neutral/max(1e-12,neutral-minimum):1.0;
    p=mix(p,vec3(neutral)+d*s,uRobustStrength*t*t*(3.0-2.0*t));
   }else{float fade=uChromaLimit*t*t*(3.0-2.0*t);p=mix(p,vec3(neutral),fade);}
  }
 }
 p=p*uExposure*uGains;
 float y=uWide==1?dot(vec3(.2627,.678,.0593),p):luma(p);
 if(y>1e-12){
  float target=max(0.0,(y-uBlack)/uWhiteRange);
  if(uInvGamma!=1.0)target=pow(target,uInvGamma);
  if(uContrast!=1.0)target=.18*pow(target/.18,uContrast);
  if(uShadows!=0.0||uHighlights!=0.0){float dy=encode(target),sw=pow(1.0-sat(dy/.65),2.0),hw=pow(sat((dy-.35)/.65),2.0);target*=exp2(-uShadows*sw*1.4+uHighlights*hw*1.4);}
  p=p*target/y;
 }
 if(uWide==1)p=displayWide(p);
 if(uProfile==2){float neutral=luma(p),mixed=dot(p,uMono);p=vec3(mix(neutral,mixed,sat(uStrength)));}
 if(uSaturation!=1.0){y=luma(p);p=max(vec3(0.0),vec3(y)+(p-vec3(y))*uSaturation);}
 float peak=max(p.r,max(p.g,p.b));
 float mapped=uShoulder==0?min(1.0,peak):peak<=.8?peak:.8+.2*(1.0-exp(-min(100.0,(peak-.8)/.2)));
 if(peak>0.0)p=p*mapped/peak;
 // Mirror the calibrated4 CPU highlight-chroma experiment exactly.
 // uShoulder == 0 is the reference mode, left unchanged.
 if(uColorVariant==0&&uProfile!=2&&uProfile!=3&&uShoulder==2&&peak>.85){
  float t=sat((peak-.85)/.45),fade=t*t*(3.0-2.0*t);
  p=mix(p,vec3(mapped),fade);
 }
 p=encode3(p);
 if(uProfile==2||uProfile==3)p=creative(p);else if(uProfile==1&&uStrength>0.0)p=mix(p,creative(p),uStrength);
 if(uPrint==1){if(uPrintShoulder!=0.0)p=p/(vec3(1.0)+uPrintShoulder*(vec3(1.0)-p));p=clamp(vec3(.5)+(p-vec3(.5))*uPrintContrast,0.0,1.0);}
 color=vec4(p,1.0);
}`;
function supports(c){
 if(c?.kind!=='calibrated4'||!c.cal?.beta4)return false;
 const f=c.profile;
 return !!f&&(c.neutralProfile||f.creativeVersion===2||f.type==='bw');
}
function create(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'default'});
 if(!gl)throw Error('WebGL 2 är inte tillgängligt');
 const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
 if(!precision||precision.precision<23)throw Error('Otillräcklig grafikprecision');
 // Both 2D and WebGL canvases use the browser's sRGB display path.
 if('drawingBufferColorSpace' in gl)gl.drawingBufferColorSpace='srgb';
 const shaders=[],program=gl.createProgram();let texture=null,source=null,sourceVersion=-1,query=null,queryStarted=0;
 const metrics={uploads:0,draws:0,submitMs:0,gpuMs:null,maxTexture:gl.getParameter(gl.MAX_TEXTURE_SIZE)};
 const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 function releaseSource(){
  if(!source)return;
  source=null;sourceVersion=-1;
  if(texture&&!gl.isContextLost()){
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB32F,1,1,0,gl.RGB,gl.FLOAT,null);
  }
 }
 function destroy(){
  if(query)gl.deleteQuery(query);query=null;
  if(texture)gl.deleteTexture(texture);texture=null;
  for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);source=null;
 }
 try{
  for(const [type,text] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);gl.attachShader(program,s);}
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||shaders.map(s=>gl.getShaderInfoLog(s)).join('\n')||'GPU-programmet kunde inte kompileras');
  gl.useProgram(program);gl.disable(gl.DITHER);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
  texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 }catch(e){destroy();throw e;}
 const locations=new Map();const location=name=>{if(!locations.has(name))locations.set(name,gl.getUniformLocation(program,name));return locations.get(name);};
 const f=(name,value)=>gl.uniform1f(location(name),value),i=(name,value)=>gl.uniform1i(location(name),value),v=(name,a)=>gl.uniform3fv(location(name),a);
 function upload(im,version){
  if(source===im&&sourceVersion===version)return;
  if(im.width>metrics.maxTexture||im.height>metrics.maxTexture)throw Error('Förhandsvisningen överskrider grafikens bildgräns');
  let data=im.data;
  if(im.channels!==3||im.encoding!=='linear'||(im.scale||1)!==1||(im.normalization||1)!==1||data.BYTES_PER_ELEMENT!==4){
   data=new Float32Array(im.width*im.height*3);
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)data.set(NSColorEngine.pixel(im,x,y),(y*im.width+x)*3);
  }
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB32F,im.width,im.height,0,gl.RGB,gl.FLOAT,data);
  if(gl.getError()!==gl.NO_ERROR)throw Error('Grafikminnet kunde inte laddas');
  source=im;sourceVersion=version;metrics.uploads++;
 }
 function poll(){
  if(!query)return;
  if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){
   if(!gl.getParameter(timer.GPU_DISJOINT_EXT))metrics.gpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
   gl.deleteQuery(query);query=null;
  }else if(performance.now()-queryStarted>2000){gl.deleteQuery(query);query=null;}
 }
 function draw(im,c,mode='positive',limit=1400,version=0){
  if(!supports(c))throw Error('Detta färgläge använder CPU');
  if(gl.isContextLost())throw Error('Grafikanslutningen förlorades');
  const start=performance.now();poll();upload(im,version);
  const ratio=Math.min(1,Math.max(1,Math.min(1400,limit))/Math.max(im.width,im.height)),width=Math.max(1,Math.round(im.width*ratio)),height=Math.max(1,Math.round(im.height*ratio));
  const resized=canvas.width!==width||canvas.height!==height;
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  gl.viewport(0,0,width,height);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.uniform2f(location('uSourceSize'),im.width,im.height);gl.uniform2f(location('uOutputSize'),width,height);i('uSource',0);
  const a=c.cal.beta4,o=c.opts,p=c.profile,parameters=NSColorParameters.prepare(c),bw=parameters.bw,profile=bw?(p.creativeVersion===2?2:3):c.neutralProfile?0:1;
  v('uLight',a.light);v('uBase',a.base);v('uOffset',a.response.offset);v('uResponseSpan',a.response.span);
  const confidence=NSPixelKernel.lowSignal4(c);v('uChromaStart',confidence.start);v('uChromaInvRange',confidence.invRange);f('uChromaLimit',confidence.strength);
  const variant=NSPixelKernel.colorVariant4(o.colorMode4);i('uColorVariant',variant==='original'?1:variant==='robust'?2:0);f('uRobustStrength',confidence.robustStrength);
  v('uGains',parameters.gains);
  f('uLo',a.lo);f('uSpan',a.span);f('uExposure',parameters.exposureGain);f('uBlack',parameters.black);f('uWhiteRange',parameters.whiteRange);
  f('uInvGamma',parameters.inverseGamma);f('uContrast',o.contrast);f('uSaturation',parameters.saturation);
  f('uShadows',(Number(o.shadows)||0)/100);f('uHighlights',(Number(o.highlights)||0)/100);f('uStrength',c.strength);
  i('uWide',c.workingSpace==='rec2020'?1:0);i('uMode',mode==='negative'?1:mode==='split'?2:0);i('uAuto',o.autoLevels?1:0);i('uShoulder',o.toneMode4==='reference'?0:o.toneMode4==='experimental'?2:1);i('uProfile',profile);i('uPrint',c.neutralPrint?0:1);
  const matrix=p.matrix||[[1,0,0],[0,1,0],[0,0,1]];gl.uniformMatrix3fv(location('uMatrix'),false,[0,1,2].flatMap(col=>matrix.map(row=>row[col])));
  gl.uniform1fv(location('uTone[0]'),p.tone||[0,.08,.18,.35,.5,.65,.8,.92,1]);gl.uniform1fv(location('uChroma[0]'),p.chroma||[1,1,1,1,1,1]);
  v('uLow',p.low||[0,0,0]);v('uHigh',p.high||[0,0,0]);v('uMono',p.mono||[.2126,.7152,.0722]);f('uBwCurve',p.bwCurve||1);f('uBwLift',p.bwLift||0);f('uPrintShoulder',c.print.shoulder||0);f('uPrintContrast',c.print.contrast);
  let measuring=false;if(timer&&!query){query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);queryStarted=performance.now();measuring=true;}
  gl.drawArrays(gl.TRIANGLES,0,3);if(measuring)gl.endQuery(timer.TIME_ELAPSED_EXT);
  if(resized&&gl.getError()!==gl.NO_ERROR)throw Error('Grafiken kunde inte skapa förhandsvisningen');
  metrics.draws++;metrics.submitMs=performance.now()-start;
  return {width,height};
 }
 function read(){
  // Explicit QA only. The editing loop never calls readPixels.
  const width=canvas.width,height=canvas.height,raw=new Uint8Array(width*height*4),data=new Uint8ClampedArray(raw.length);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,raw);
  for(let y=0;y<height;y++)data.set(raw.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);
  return {width,height,data};
 }
 function validate(c){
  // Detect unusable device precision before showing GPU pixels. Small readback only.
  const width=24,height=16,data=new Float32Array(width*height*3);
  for(let n=0;n<width*height;n++)for(let k=0;k<3;k++)data[n*3+k]=n<8?[0,1/65535,.0001,.001,.01,.1,.5,1][n]:((n*(177+k*263)+k*337)%65536)/65535;
  const im={width,height,data,channels:3,encoding:'linear',scale:1};draw(im,c,'positive',width,-1);const result=read(),kernel=NSPixelKernel.compile(c);let maxError=0;
  for(let n=0;n<width*height;n++){const p=kernel.pixel([data[n*3],data[n*3+1],data[n*3+2]]);for(let k=0;k<3;k++)maxError=Math.max(maxError,Math.abs(result.data[n*4+k]-Math.round(p[k]*255)));}
  if(maxError>2)throw Error('GPU-färgkontroll avvek '+maxError+' nivåer');return maxError;
 }
 return {draw,read,validate,releaseSource,destroy,metrics,context:gl};
}
root.NSGpuPreview={create,supports};
})(globalThis);
