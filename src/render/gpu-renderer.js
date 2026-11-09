/* WebGL 2 preview prototype. RGB32F source, highp math, 8-bit sRGB display.
   V2 reconstruction uses a cached RGBA32F target; no interactive readback.
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
uniform float uLo,uSpan,uExposure,uBlack,uWhiteRange,uInvGamma,uContrast,uSaturation,uShadows,uHighlights;
uniform int uV2Positive,uMode,uAuto,uShoulder,uWide;
out vec4 color;
const vec3 W=vec3(.2126,.7152,.0722);
float sat(float x){return clamp(x,0.0,1.0);}
float luma(vec3 p){return dot(W,p);}
float encode(float x){x=sat(x);return x<=.0031308?12.92*x:1.055*pow(x,1.0/2.4)-.055;}
vec3 encode3(vec3 p){return vec3(encode(p.r),encode(p.g),encode(p.b));}
vec3 displayWide(vec3 p){
  vec3 q=vec3(dot(vec3(1.6604910021084345,-.5876411387885495,-.0728498633198848),p),dot(vec3(-.1245504745215907,1.13289989712596,-.0083494226043694),p),dot(vec3(-.0181507633549052,-.1005788980080074,1.1187296613629127),p));
  float l=max(0.0,luma(q)),m=min(q.r,min(q.g,q.b)),s=m<0.0?l/max(1e-12,l-m):1.0;return max(vec3(0.0),vec3(l)+(q-vec3(l))*s);
 }
vec3 softDensity(vec3 p,vec3 start,vec3 range){vec3 d=max(vec3(0.0),p-start);return p-d+range*(vec3(1.0)-exp(-d/range));}
${NSEditing2.glsl}
${NSProfiles.glsl}
${NSConversion3.glsl}
vec3 finishPositive(vec3 p){
 p=lookPositive(p);
 return uEdit2?editPositive(p):p;
}
void main(){
 // Texture row zero is the top source row; framebuffer row zero is bottom.
 vec2 pos=vec2(gl_FragCoord.x,uOutputSize.y-gl_FragCoord.y);
 ivec2 at=min(ivec2(uSourceSize)-ivec2(1),ivec2(floor(pos*uSourceSize/uOutputSize)));
 vec3 p=texelFetch(uSource,at,0).rgb;
 if(uMode==1||(uMode==2&&floor(pos.x)<uOutputSize.x/2.0)){color=vec4(encode3(uWide==1?displayWide(p):p),1.0);return;}
 if(uV2Positive==1){color=vec4(finishPositive(p),1.0);return;}
 if(uConversion3!=0){color=vec4(finishConversion3(conversion3(p)),1.0);return;}
 p=(-log(max(vec3(1.0/65535.0),p)*uLight/uBase)/log(10.0)-uOffset)/uResponseSpan;
 vec3 density=p;
 p=max(vec3(0.0),uAuto==1?(p-vec3(uLo))/uSpan:p);
 if(uColorVariant!=1){
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
 if(uSaturation!=1.0){y=luma(p);p=max(vec3(0.0),vec3(y)+(p-vec3(y))*uSaturation);}
 float peak=max(p.r,max(p.g,p.b));
 float mapped=uShoulder==0?min(1.0,peak):peak<=.8?peak:.8+.2*(1.0-exp(-min(100.0,(peak-.8)/.2)));
 if(peak>0.0)p=p*mapped/peak;
 // Mirror the calibrated4 CPU highlight-chroma experiment exactly.
 // uShoulder == 0 is the reference mode, left unchanged.
 if(uColorVariant==0&&uShoulder==2&&peak>.85){
  float t=sat((peak-.85)/.45),fade=t*t*(3.0-2.0*t);
  p=mix(p,vec3(mapped),fade);
 }
 p=encode3(p);
 color=vec4(finishPositive(p),1.0);
}`;
const reconstructionFragment=`#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uSource;
out vec4 color;
float luma(vec3 p){return dot(vec3(.2126,.7152,.0722),p);}
${NSV2GpuMath.glsl}
// Store logical source row zero at GL texture row zero, just like CPU uploads.
void main(){color=vec4(v2positive(texelFetch(uSource,ivec2(gl_FragCoord.xy),0).rgb),1.0);}`;
function supports(c){
 if(c?.kind==='v2')return !!c.v2&&NSEditing2.version(c.opts.editVersion)===2;
 return c?.kind==='calibrated4'?!!c.cal?.beta4:NSConversion3.is(c?.kind)&&NSConversion3.valid(c.conversion3);
}
function create(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'default'});
 if(!gl)throw Error('WebGL 2 är inte tillgängligt');
 const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
 if(!precision||precision.precision<23)throw Error('Otillräcklig grafikprecision');
 // Both 2D and WebGL canvases use the browser's sRGB display path.
 if('drawingBufferColorSpace' in gl)gl.drawingBufferColorSpace='srgb';
 const shaders=[],program=gl.createProgram();let texture=null,source=null,sourceVersion=-1,positiveTexture=null,positiveSource=null,positiveVersion=null,validating=false,query=null,queryStarted=0,reconstructionProgram=null,positiveFramebuffer=null,gpuPositiveSource=null,gpuPositiveKey=null,gpuPositiveSize=null,reconstructionQuery=null,reconstructionQueryStarted=0,reconstructionQueryKey=null;
 const metrics={uploads:0,positiveUploads:0,validationUploads:0,sourceTextureBytes:0,positiveTextureBytes:0,lastPositiveUploadMs:0,reconstructions:0,validationReconstructions:0,reconstructionSubmitMs:0,reconstructionGpuMs:null,reconstructionKey:null,sourcePreparationMs:0,sourceUploadSubmitMs:0,positiveFloatError:null,technicalRelativeError:null,draws:0,submitMs:0,gpuMs:null,maxTexture:gl.getParameter(gl.MAX_TEXTURE_SIZE)};
 const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),floatColor=!!gl.getExtension('EXT_color_buffer_float');
 function releaseSource(){
  source=positiveSource=gpuPositiveSource=null;gpuPositiveKey=gpuPositiveSize=null;sourceVersion=-1;positiveVersion=null;metrics.reconstructionKey=null;metrics.reconstructionGpuMs=null;metrics.sourceTextureBytes=metrics.positiveTextureBytes=0;
  if(!gl.isContextLost())for(const t of [texture,positiveTexture])if(t){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB32F,1,1,0,gl.RGB,gl.FLOAT,null);}
 }
 function destroy(){
  if(query)gl.deleteQuery(query);query=null;if(reconstructionQuery)gl.deleteQuery(reconstructionQuery);reconstructionQuery=null;
  if(positiveFramebuffer)gl.deleteFramebuffer(positiveFramebuffer);positiveFramebuffer=null;
  if(texture)gl.deleteTexture(texture);if(positiveTexture)gl.deleteTexture(positiveTexture);texture=positiveTexture=null;positiveSource=null;metrics.sourceTextureBytes=metrics.positiveTextureBytes=0;
  for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);if(reconstructionProgram)gl.deleteProgram(reconstructionProgram);reconstructionProgram=null;source=gpuPositiveSource=null;gpuPositiveKey=gpuPositiveSize=null;metrics.reconstructionKey=null;metrics.reconstructionGpuMs=null;
 }
 try{
  for(const [type,text] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);gl.attachShader(program,s);}
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||shaders.map(s=>gl.getShaderInfoLog(s)).join('\n')||'GPU-programmet kunde inte kompileras');
  gl.useProgram(program);gl.disable(gl.DITHER);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
  texture=newTexture();
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
 }catch(e){destroy();throw e;}
 const locations=new Map();const location=name=>{if(!locations.has(name))locations.set(name,gl.getUniformLocation(program,name));return locations.get(name);};
 const f=(name,value)=>gl.uniform1f(location(name),value),i=(name,value)=>gl.uniform1i(location(name),value),v=(name,a)=>gl.uniform3fv(location(name),a);
 function newTexture(){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 function uploadPositive(im,version){
  if(!im||im.encoding!=='srgb'||im.colorSpace!=='srgb'||(im.scale||1)!==1||(im.normalization||1)!==1||!(im.data instanceof Float32Array)||im.data.length!==im.width*im.height*3)throw Error('V2_GPU_POSITIVE_DOMAIN');
  if(!positiveTexture)positiveTexture=newTexture();gl.bindTexture(gl.TEXTURE_2D,positiveTexture);
  if(positiveSource===im&&positiveVersion===version)return;
  if(im.width>metrics.maxTexture||im.height>metrics.maxTexture)throw Error('V2_GPU_TEXTURE_LIMIT');
  const start=performance.now();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB32F,im.width,im.height,0,gl.RGB,gl.FLOAT,im.data);
  if(gl.getError()!==gl.NO_ERROR)throw Error('V2_GPU_POSITIVE_UPLOAD');
  positiveSource=im;positiveVersion=version;gpuPositiveSource=null;gpuPositiveKey=gpuPositiveSize=null;
  if(validating)metrics.validationUploads++;else{metrics.uploads++;metrics.positiveUploads++;metrics.positiveTextureBytes=im.data.byteLength;metrics.lastPositiveUploadMs=performance.now()-start;}
 }
 function upload(im,version,v2=false,descriptor=null){
  gl.bindTexture(gl.TEXTURE_2D,texture);
  const signature=JSON.stringify([version,im.previewRevision,im.width,im.height,im.channels,im.encoding,im.colorSpace,im.scale,im.normalization,im.flatField,descriptor]);
  if(source===im&&sourceVersion===signature)return;
  const started=performance.now();
  if(im.width>metrics.maxTexture||im.height>metrics.maxTexture)throw Error('Förhandsvisningen överskrider grafikens bildgräns');
  let data=im.data;
  if(v2&&im.flatField||im.channels!==3||im.encoding!=='linear'||(im.scale||1)!==1||(im.normalization||1)!==1||data.BYTES_PER_ELEMENT!==4){
   data=new Float32Array(im.width*im.height*3);
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)data.set(v2?NSV2Platform.read(im,(y*im.width+x)*3,x,y):NSColorEngine.pixel(im,x,y),(y*im.width+x)*3);
  }
  const prepared=performance.now();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB32F,im.width,im.height,0,gl.RGB,gl.FLOAT,data);
  if(!validating){metrics.sourcePreparationMs=prepared-started;metrics.sourceUploadSubmitMs=performance.now()-prepared;}
  if(gl.getError()!==gl.NO_ERROR)throw Error('Grafikminnet kunde inte laddas');
  source=im;sourceVersion=signature;if(validating)metrics.validationUploads++;else{metrics.uploads++;metrics.sourceTextureBytes=data.byteLength;}
 }
 function reconstructionUniforms(){
  if(!reconstructionProgram){
   reconstructionProgram=gl.createProgram();
   for(const [type,text]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,reconstructionFragment]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);gl.attachShader(reconstructionProgram,shader);}
   gl.linkProgram(reconstructionProgram);if(!gl.getProgramParameter(reconstructionProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(reconstructionProgram)||'V2_GPU_SHADER');
  }
  gl.useProgram(reconstructionProgram);
  return name=>{if(!reconstructionLocations.has(name))reconstructionLocations.set(name,gl.getUniformLocation(reconstructionProgram,name));return reconstructionLocations.get(name);};
 }
 const reconstructionLocations=new Map();
 function reconstruct(im,c,version,probe=false){
  const key=JSON.stringify([version,NSPixelKernel.v2PreviewKey(im,c),probe]);
  if(gpuPositiveSource===im&&gpuPositiveKey===key)return;
  if(!floatColor)throw Error('V2_GPU_FLOAT_TARGET_UNAVAILABLE');
  if(im.encoding!=='linear'||im.colorSpace!=='rec2020'||(im.scale||1)!==1||(im.normalization||1)!==1)throw Error('V2_GPU_SOURCE_DOMAIN');
  const start=performance.now(),p=NSV2GpuMath.parameters(c.v2),location=reconstructionUniforms(),i=(name,value)=>gl.uniform1i(location(name),value),f=(name,value)=>gl.uniform1f(location(name),value),v=(name,value)=>gl.uniform3fv(location(name),value);upload(im,version,true,c.v2.source);
  if(!positiveTexture)positiveTexture=newTexture();
  if(!positiveFramebuffer)positiveFramebuffer=gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D,positiveTexture);
  const size=im.width+','+im.height;
  if(gpuPositiveSize!==size){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,im.width,im.height,0,gl.RGBA,gl.FLOAT,null);gpuPositiveSize=size;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,positiveFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,positiveTexture,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE||gl.getError()!==gl.NO_ERROR){gl.bindFramebuffer(gl.FRAMEBUFFER,null);throw Error('V2_GPU_FLOAT_TARGET_ALLOCATION');}
  try{
   gl.viewport(0,0,im.width,im.height);gl.useProgram(reconstructionProgram);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);i('uSource',0);i('uV2Probe',probe?1:0);
   i('uV2Calibration',p.version);i('uV2Balance',p.balance?1:0);i('uV2Photo',p.photo);i('uV2Output',p.output);f('uV2Exposure',p.exposure);
   for(const [name,value]of [['BaseHi',p.baseHi],['BaseLo',p.baseLo],['LogBase',p.logBase],['LogFloor',p.logFloor],['Slope',p.slope],['Reference',p.reference],['Norm',p.norm],['Offset',p.offset],['Knots',p.knots]])v('uV2'+name,value);
   gl.uniform3fv(location('uV2Gain[0]'),p.gains.flat());
   for(const [name,m]of [['DensityMatrix',p.densityMatrix],['Matrix',p.matrix]])gl.uniformMatrix3fv(location('uV2'+name),false,[0,1,2].flatMap(col=>m.map(row=>row[col])));
   let measuring=false;if(timer&&!reconstructionQuery&&!validating){reconstructionQuery=gl.createQuery();reconstructionQueryKey=key;reconstructionQueryStarted=performance.now();gl.beginQuery(timer.TIME_ELAPSED_EXT,reconstructionQuery);measuring=true;}
   if(!validating)metrics.reconstructionGpuMs=null;gl.drawArrays(gl.TRIANGLES,0,3);if(measuring)gl.endQuery(timer.TIME_ELAPSED_EXT);if(gl.getError()!==gl.NO_ERROR)throw Error('V2_GPU_RECONSTRUCTION');
   gpuPositiveSource=im;gpuPositiveKey=key;positiveSource=null;positiveVersion=null;
   if(validating)metrics.validationReconstructions++;else{metrics.reconstructions++;metrics.reconstructionKey=NSV2Platform.fingerprint(key);metrics.positiveTextureBytes=im.width*im.height*16;metrics.reconstructionSubmitMs=performance.now()-start;}
  }finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(program);}
 }
 // Explicit float-domain QA only. The editing loop never reads this target.
 function readPositive(){
  if(!positiveFramebuffer||!gpuPositiveSource)throw Error('V2_GPU_NO_POSITIVE');
  const im=gpuPositiveSource,data=new Float32Array(im.width*im.height*4);gl.bindFramebuffer(gl.FRAMEBUFFER,positiveFramebuffer);
  try{gl.readPixels(0,0,im.width,im.height,gl.RGBA,gl.FLOAT,data);if(gl.getError()!==gl.NO_ERROR)throw Error('V2_GPU_FLOAT_READ');return {width:im.width,height:im.height,data};}finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 }
 function poll(){
  if(reconstructionQuery){if(gl.getQueryParameter(reconstructionQuery,gl.QUERY_RESULT_AVAILABLE)){if(reconstructionQueryKey===gpuPositiveKey)metrics.reconstructionGpuMs=gl.getParameter(timer.GPU_DISJOINT_EXT)?null:gl.getQueryParameter(reconstructionQuery,gl.QUERY_RESULT)/1e6;gl.deleteQuery(reconstructionQuery);reconstructionQuery=null;}else if(performance.now()-reconstructionQueryStarted>2000){gl.deleteQuery(reconstructionQuery);reconstructionQuery=null;}}
  if(!query)return;
  if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){
   if(!gl.getParameter(timer.GPU_DISJOINT_EXT))metrics.gpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
   gl.deleteQuery(query);query=null;
  }else if(performance.now()-queryStarted>2000){gl.deleteQuery(query);query=null;}
 }
 function draw(im,c,mode='positive',limit=1400,version=0,positive=null){
  if(!supports(c))throw Error('Detta färgläge använder CPU');
  if(gl.isContextLost())throw Error('Grafikanslutningen förlorades');
  const start=performance.now();poll();const v2=c.kind==='v2';if(v2&&mode!=='negative'){if(mode==='split')throw Error('V2_GPU_SPLIT_REQUIRES_PRESENTATION');if(positive){if(positive.width!==im.width||positive.height!==im.height)throw Error('V2_GPU_POSITIVE_SIZE');uploadPositive(positive,version);}else reconstruct(im,c,version);}else upload(im,version,v2,v2?c.v2.source:null);
  const ratio=Math.min(1,Math.max(1,Math.min(1400,limit))/Math.max(im.width,im.height)),width=Math.max(1,Math.round(im.width*ratio)),height=Math.max(1,Math.round(im.height*ratio));
  const resized=canvas.width!==width||canvas.height!==height;
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,v2&&mode!=='negative'?positiveTexture:texture);
  gl.uniform2f(location('uSourceSize'),im.width,im.height);gl.uniform2f(location('uOutputSize'),width,height);i('uSource',0);
  const edit=NSEditing2.version(c.opts.editVersion)===2?NSEditing2.prepare(c.opts,!!c.monochrome):null;
  const conversion=NSConversion3.is(c.kind)?c.conversion3:null;
  const a=v2?{light:[1,1,1],base:[1,1,1],response:{offset:[0,0,0],span:[1,1,1]},lo:0,span:1}:conversion?{...conversion.reference,response:{offset:conversion.reference.lo,span:conversion.reference.spans},lo:0,span:1}:c.cal.beta4,o=edit?{...c.opts,...NSEditing2.neutral}:c.opts,parameters=NSColorParameters.prepare(edit?{...c,opts:o}:c),look=NSProfiles.compile(c.look,!!c.monochrome);
  i('uEdit2',edit?1:0);i('uV2Positive',v2&&mode!=='negative'?1:0);
  if(edit){i('uEditIdentity',edit.identity?1:0);v('uEditGains',edit.gains);f('uEditSaturation',edit.saturation);f('uEditVibrance',edit.vibrance);f('uEditKnee',edit.knee);gl.uniform4fv(location('uEditCurve[0]'),edit.tone.coefficients.flat());}
  i('uConversion3',conversion?NSConversion3.ids.indexOf(c.kind)+1:0);
  if(conversion){i('uCurveIdentity3',conversion.curve.kind==='identity'?1:0);i('uMatrixIdentity3',conversion.matrix.kind==='identity'?1:0);i('uNoBase3',conversion.reference.noBase?1:0);gl.uniform4fv(location('uFilmCurve3[0]'),conversion.curve.channels.flatMap(c=>c.coefficients.flat()));const m=conversion.matrix.matrix;gl.uniformMatrix3fv(location('uConversionMatrix3'),false,[0,1,2].flatMap(col=>m.map(row=>row[col])));f('uLegacyBlack3',o.shadow);f('uLegacyRange3',parameters.displayRange);}
  v('uLight',a.light);v('uBase',a.base);v('uOffset',a.response.offset);v('uResponseSpan',a.response.span);
  const confidence=conversion||v2?{start:[0,0,0],invRange:[1,1,1],strength:0,robustStrength:0}:NSPixelKernel.lowSignal4(c);v('uChromaStart',confidence.start);v('uChromaInvRange',confidence.invRange);f('uChromaLimit',confidence.strength);
  const variant=NSPixelKernel.colorVariant4(o.colorMode4);i('uColorVariant',variant==='original'?1:variant==='robust'?2:0);f('uRobustStrength',confidence.robustStrength);
  v('uGains',parameters.gains);
  f('uLo',a.lo);f('uSpan',a.span);f('uExposure',parameters.exposureGain);f('uBlack',parameters.black);f('uWhiteRange',parameters.whiteRange);
  f('uInvGamma',parameters.inverseGamma);f('uContrast',o.contrast);f('uSaturation',parameters.saturation);
  f('uShadows',(Number(o.shadows)||0)/100);f('uHighlights',(Number(o.highlights)||0)/100);
  i('uWide',v2||c.workingSpace==='rec2020'?1:0);i('uMode',mode==='negative'?1:mode==='split'?2:0);i('uAuto',o.autoLevels?1:0);i('uShoulder',o.toneMode4==='reference'?0:o.toneMode4==='experimental'?2:1);i('uLookActive',look.identity||look.monochrome?0:1);i('uMonochrome',look.monochrome?1:0);f('uLookStrength',look.strength);
  if(look.parameters){const p=look.parameters;gl.uniform4fv(location('uLookCurve[0]'),look.tone.coefficients.flat());gl.uniform4fv(location('uLookHue[0]'),p.hue.flatMap(v=>[v[1],v[2],v[3],0]));gl.uniform1fv(location('uLookChroma[0]'),p.chroma);gl.uniform2fv(location('uLookShadow'),p.shadow);gl.uniform2fv(location('uLookHighlight'),p.highlight);f('uLookSkinPass',p.skinPass);}
  let measuring=false;if(timer&&!query&&!validating){query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);queryStarted=performance.now();measuring=true;}
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
  const im={width,height,data,channels:3,encoding:'linear',colorSpace:c.kind==='v2'?'rec2020':c.workingSpace,scale:1};
  if(c.kind==='v2')for(let n=0;n<width*height;n++)for(let k=0;k<3;k++)data[n*3+k]=c.v2.base.rgb[k]*10**(-(.01+2*((n*(177+k*263)+k*337)%65536)/65535));
  if(c.kind==='v2')for(let n=0;n<9;n++)for(let k=0;k<3;k++)data[n*3+k]=n===0?0:n===1?-1:n===2?NaN:n===3?Infinity:n===4?1e-12:c.v2.base.rgb[k]*(1+(n-6)*1e-6);
  // Validation uses temporary texture objects, never evicting the real image.
  return scratch(()=>{draw(im,c,'positive',width,-1);const result=read(),kernel=NSPixelKernel.compile(c);let maxError=0;
  if(c.kind==='v2'){const actual=readPositive().data,expected=NSPixelKernel.v2PositiveImage(im,c,{cache:false}).data;let error=0;for(let n=0;n<width*height;n++)for(let k=0;k<3;k++){const value=actual[n*4+k];if(!Number.isFinite(value))throw Error('V2_GPU_NONFINITE');error=Math.max(error,Math.abs(value-expected[n*3+k]));}metrics.positiveFloatError=error;if(error>1e-4)throw Error('V2_GPU_FLOAT_PRECISION '+error);}
  for(let n=0;n<width*height;n++){const p=kernel.pixel([data[n*3],data[n*3+1],data[n*3+2]]);for(let k=0;k<3;k++)maxError=Math.max(maxError,Math.abs(result.data[n*4+k]-Math.round(p[k]*255)));}
  if(c.kind==='v2'){const actual=probeTechnical(im,c).data,reference=NSConversionV2.compile(c.v2.source,c.v2.base,c.v2.calibration);let error=0;for(let n=0;n<width*height;n++){const expected=reference.pixel([data[n*3],data[n*3+1],data[n*3+2]]).positive;for(let k=0;k<3;k++){const value=actual[n*4+k];if(!Number.isFinite(value))throw Error('V2_GPU_TECHNICAL_NONFINITE');error=Math.max(error,Math.abs(value-expected[k])/Math.max(1e-30,expected[k]));}}metrics.technicalRelativeError=error;if(error>1e-3)throw Error('V2_GPU_TECHNICAL_PRECISION '+error);}
  if(maxError>2)throw Error('GPU-färgkontroll avvek '+maxError+' nivåer');return maxError;
  });
 }
 function scratch(action){
  const wasValidating=validating,saved={texture,source,sourceVersion,positiveTexture,positiveSource,positiveVersion,positiveFramebuffer,gpuPositiveSource,gpuPositiveKey,gpuPositiveSize};validating=true;positiveFramebuffer=gpuPositiveSource=gpuPositiveKey=gpuPositiveSize=null;texture=newTexture();source=null;sourceVersion=-1;positiveTexture=positiveSource=null;positiveVersion=null;
  try{return action();}finally{gl.deleteTexture(texture);if(positiveTexture)gl.deleteTexture(positiveTexture);if(positiveFramebuffer)gl.deleteFramebuffer(positiveFramebuffer);({texture,source,sourceVersion,positiveTexture,positiveSource,positiveVersion,positiveFramebuffer,gpuPositiveSource,gpuPositiveKey,gpuPositiveSize}=saved);validating=wasValidating;}
 }
 function probeTechnical(im,c,version=-2){return scratch(()=>{reconstruct(im,c,version,true);return readPositive();});}
 return {draw,read,readPositive,probeTechnical,validate,releaseSource,destroy,metrics,context:gl,capabilities:{floatColor}};
}
root.NSGpuPreview={create,supports};
})(globalThis);
