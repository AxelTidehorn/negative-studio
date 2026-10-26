/* Bounded display-only geometry pass. Cached color is never re-analysed.
   Matrices come from NSGeometry; no second rotation implementation exists here. */
(function(root){
'use strict';
const vertex=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
uniform sampler2D image,imageNegative;
uniform bool split;
uniform vec2 size,outputSize,origin,dx,dy,lo,hi;
out vec4 color;
vec3 decode(vec3 p){return mix(pow((p+.055)/1.055,vec3(2.4)),p/12.92,lessThanEqual(p,vec3(.04045)));}
vec3 encode(vec3 p){return mix(1.055*pow(max(p,vec3(0.)),vec3(1./2.4))-.055,12.92*p,lessThanEqual(p,vec3(.0031308)));}
vec3 readAt(vec2 p,bool neg){ivec2 at=ivec2(p.x,size.y-1.-p.y);return decode(neg?texelFetch(imageNegative,at,0).rgb:texelFetch(image,at,0).rgb);}
void main(){
 vec2 uv=vec2(gl_FragCoord.x/outputSize.x,1.-gl_FragCoord.y/outputSize.y),s=origin+dx*uv.x+dy*uv.y;
 if(any(lessThan(s,vec2(0.)))||any(greaterThan(s,vec2(1.)))){color=vec4(.035,.045,.05,1.);return;}
 vec2 p=clamp(s*size-.5,lo,hi),a=floor(p),b=min(a+1.,hi),f=fract(p);
 bool neg=split&&uv.x<.5;
 color=vec4(encode(mix(mix(readAt(a,neg),readAt(vec2(b.x,a.y),neg),f.x),mix(readAt(vec2(a.x,b.y),neg),readAt(b,neg),f.x),f.y)),1.);
}`;
function create(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL 2 saknas');
 const program=gl.createProgram(),shaders=[];let texture=gl.createTexture(),negativeTexture=null,size=null;
 for(const [type,text] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const sh=gl.createShader(type);shaders.push(sh);gl.shaderSource(sh,text);gl.compileShader(sh);gl.attachShader(program,sh);}
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);gl.disable(gl.DITHER);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
 for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);
 for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
 const loc=n=>gl.getUniformLocation(program,n),vec=(n,p)=>gl.uniform2f(loc(n),p.x,p.y);
 function upload(source,negative=false){
  if(gl.isContextLost())throw Error('Geometrins grafikanslutning förlorades');
  if(negative&&!negativeTexture){negativeTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,negativeTexture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);}
  gl.bindTexture(gl.TEXTURE_2D,negative?negativeTexture:texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);size={width:source.width,height:source.height};
 }
 function draw(plan,width,height,bounds,split=false){
  if(!size)return false;if(gl.isContextLost())throw Error('Geometrins grafikanslutning förlorades');
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;gl.viewport(0,0,width,height);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  const a=plan.inverse({x:0,y:0}),b=plan.inverse({x:1,y:0}),c=plan.inverse({x:0,y:1}),W=plan.sourceWidth,H=plan.sourceHeight;
  vec('origin',{x:a.x/W,y:a.y/H});vec('dx',{x:(b.x-a.x)/W,y:(b.y-a.y)/H});vec('dy',{x:(c.x-a.x)/W,y:(c.y-a.y)/H});
  vec('size',{x:size.width,y:size.height});vec('outputSize',{x:width,y:height});
  const x0=Math.min(size.width-1,Math.ceil(bounds.x0/W*size.width-.5)),y0=Math.min(size.height-1,Math.ceil(bounds.y0/H*size.height-.5));
  vec('lo',{x:Math.max(0,x0),y:Math.max(0,y0)});vec('hi',{x:Math.max(x0,Math.min(size.width-1,Math.floor(bounds.x1/W*size.width-.5))),y:Math.max(y0,Math.min(size.height-1,Math.floor(bounds.y1/H*size.height-.5)))});
  gl.uniform1i(loc('image'),0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,negativeTexture||texture);gl.uniform1i(loc('imageNegative'),1);gl.uniform1i(loc('split'),split&&!!negativeTexture?1:0);gl.activeTexture(gl.TEXTURE0);gl.drawArrays(gl.TRIANGLES,0,3);return true;
 }
 function clear(){if(negativeTexture)gl.deleteTexture(negativeTexture);negativeTexture=null;gl.deleteTexture(texture);texture=gl.createTexture();size=null;gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);}
 function destroy(){if(negativeTexture)gl.deleteTexture(negativeTexture);gl.deleteTexture(texture);for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);size=null;}
 return {upload,draw,clear,destroy};
}
// Scalar fallback for the same cached display image (not a second color pipeline).
function cpu(image,plan,width,height,bounds,negative=null){
 const out=new Uint8ClampedArray(width*height*4),decode=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;},encode=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
 const x0=Math.max(0,Math.min(image.width-1,Math.ceil(bounds.x0/plan.sourceWidth*image.width-.5))),y0=Math.max(0,Math.min(image.height-1,Math.ceil(bounds.y0/plan.sourceHeight*image.height-.5)));
 const x1=Math.max(x0,Math.min(image.width-1,Math.floor(bounds.x1/plan.sourceWidth*image.width-.5))),y1=Math.max(y0,Math.min(image.height-1,Math.floor(bounds.y1/plan.sourceHeight*image.height-.5)));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=plan.inverse({x:(x+.5)/width,y:(y+.5)/height}),i=(y*width+x)*4,s=p.x/plan.sourceWidth,t=p.y/plan.sourceHeight;out[i+3]=255;
  if(s<0||s>1||t<0||t>1){out[i]=9;out[i+1]=11;out[i+2]=13;continue;}
  const u=Math.max(x0,Math.min(x1,s*image.width-.5)),v=Math.max(y0,Math.min(y1,t*image.height-.5)),a=Math.floor(u),b=Math.floor(v),fx=u-a,fy=v-b;
  for(let k=0;k<3;k++){let sum=0;for(const [xx,yy,w] of [[a,b,(1-fx)*(1-fy)],[Math.min(x1,a+1),b,fx*(1-fy)],[a,Math.min(y1,b+1),(1-fx)*fy],[Math.min(x1,a+1),Math.min(y1,b+1),fx*fy]])sum+=decode((negative&&x<width/2?negative:image).data[(yy*image.width+xx)*4+k])*w;out[i+k]=Math.round(encode(sum)*255);}
 }
 return {width,height,data:out};
}
root.NSPreviewPresentation={create,cpu};
})(globalThis);
