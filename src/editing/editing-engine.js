/* Editing 2.0 v1: display-linear positive adapter, not a conversion engine.
   Fixed knots + shape-preserving cubic Hermite; no image-dependent analysis.
   Shared coefficients/constants for JS and the fused WebGL color pass. */
(function(root){
'use strict';
const W=[.2126,.7152,.0722],X=[0,.01,.04,.1,.18,.35,.6,.85,1];
const neutral=Object.freeze({editVersion:1,exposure:0,contrast:1,gamma:1,shadows:0,highlights:0,shadow:.015,highlight:.99,temperature:0,tint:0,saturation:1});
const clamp=v=>Math.max(0,Math.min(1,v));
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const encode=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const version=v=>v===2?2:1;
function options(o){const out={};for(const [k,a,b] of [['exposure',-2,2],['contrast',.5,1.7],['gamma',.65,1.6],['shadows',-100,100],['highlights',-100,100],['shadow',0,.12],['highlight',.85,1],['temperature',-35,35],['tint',-35,35],['saturation',0,1.8]])out[k]=Number.isFinite(o[k])?Math.max(a,Math.min(b,o[k])):neutral[k];return out;}
// PCHIP weighted harmonic tangents; endpoint limiting and monotone constant runs.
function curve(values){
 const h=X.slice(1).map((v,i)=>v-X[i]),d=h.map((v,i)=>(values[i+1]-values[i])/v),m=new Array(X.length);
 function end(h0,h1,d0,d1){let t=((2*h0+h1)*d0-h0*d1)/(h0+h1);if(t*d0<=0)t=0;else if(d0*d1<=0&&Math.abs(t)>3*Math.abs(d0))t=3*d0;return t;}
 m[0]=end(h[0],h[1],d[0],d[1]);const n=d.length;m[n]=end(h[n-1],h[n-2],d[n-1],d[n-2]);
 for(let i=1;i<n;i++){const a=2*h[i]+h[i-1],b=h[i]+2*h[i-1];m[i]=d[i-1]*d[i]<=0?0:(a+b)/(a/d[i-1]+b/d[i]);}
 const coefficients=h.map((v,i)=>[values[i],v*m[i],3*(values[i+1]-values[i])-v*(2*m[i]+m[i+1]),2*(values[i]-values[i+1])+v*(m[i]+m[i+1])]);
 return {values,coefficients,slopes:m};
}
function evaluate(tone,y){y=clamp(y);let k=0;while(k<7&&y>X[k+1])k++;const t=(y-X[k])/(X[k+1]-X[k]),a=tone.coefficients[k];return ((a[3]*t+a[2])*t+a[1])*t+a[0];}
function prepare(input,monochrome=false){
 const o=options(input);if(monochrome){o.temperature=0;o.tint=0;o.saturation=1;}
 const gain=2**o.exposure,black=decode(o.shadow)-decode(neutral.shadow),white=1+decode(o.highlight)-decode(neutral.highlight);
 const sigmoid=v=>1/(1+Math.exp(-v)),logit=v=>Math.log(v/(1-v)),pivot=logit(.18);
 const values=X.map(x=>{
  let y=clamp((x-black)/(white-black));
  // Multiplicative positive gain with continuous white-preserving headroom for
  // positive EV. Negative EV remains multiplicative; this is not scene exposure.
  y=y*gain/(1+Math.max(0,gain-1)*y);
  if(o.gamma!==1)y=y**(1/o.gamma);
  if(y>0&&y<1){
   if(o.contrast!==1)y=sigmoid(pivot+o.contrast*(logit(y)-pivot));
   if(o.shadows||o.highlights)y=sigmoid(logit(y)+1.2*(o.shadows/100*(1-y)**2-o.highlights/100*y*y));
  }
  return y;
 });
 const gains=[Math.exp(o.temperature/180+o.tint/350),Math.exp(-o.tint/120),Math.exp(-o.temperature/180+o.tint/350)],normalization=dot(W,gains);
 const amount=Math.max(Math.abs(o.exposure)/2,Math.abs(o.contrast-1)/.7,Math.abs(o.gamma-1)/.6,Math.abs(o.shadows)/100,Math.abs(o.highlights)/100,Math.abs(o.shadow-neutral.shadow)/.105,Math.abs(o.highlight-neutral.highlight)/.14,Math.abs(o.temperature)/35,Math.abs(o.tint)/35,Math.abs(o.saturation-1));
 return {knee:.1*Math.min(1,amount),tone:curve(values),gains:gains.map(v=>v/normalization),saturation:o.saturation,identity:Object.keys(o).every(k=>o[k]===neutral[k])};
}
// Ottosson's published D65 linear-sRGB/OKLab matrices; independent implementation.
const M1=[[.4122214708,.5363325363,.0514459929],[.2119034982,.6806995451,.1073969566],[.0883024619,.2817188376,.6299787005]],M2=[[.2104542553,.793617785,-.0040720468],[1.9779984951,-2.428592205,.4505937099],[.0259040371,.7827717662,-.808675766]],I1=[[1,.3963377774,.2158037573],[1,-.1055613458,-.0638541728],[1,-.0894841775,-1.291485548]],I2=[[4.0767416621,-3.3077115913,.2309699292],[-1.2684380046,2.6097574011,-.3413193965],[-.0041960863,-.7034186147,1.707614701]];
const lab=p=>{const lms=M1.map(row=>Math.cbrt(dot(row,p)));return M2.map(row=>dot(row,lms));};
const rgb=p=>{const lms=I1.map(row=>dot(row,p)**3);return I2.map(row=>dot(row,lms));};
function saturation(p,s){if(s===1||Math.max(...p)-Math.min(...p)<1e-7)return p;const q=lab(p);return rgb([q[0],q[1]*s,q[2]*s]);}
function gamut(p,knee=.1){
 const y=clamp(dot(W,p)),d=p.map(v=>v-y);let bound=1e20;
 for(let k=0;k<3;k++){if(d[k]>0)bound=Math.min(bound,(1-y)/d[k]);else if(d[k]<0)bound=Math.min(bound,-y/d[k]);}
 const u=1/Math.max(1e-20,bound),start=1-knee,s=u<=start?1:knee>0?(start+knee*(-Math.expm1(-(u-start)/knee)))/u:1/u;
 return d.map(v=>clamp(y+v*s));
}
function compile(input,monochrome=false){
 const p=prepare(input,monochrome),black=p.tone.values[0];
 return {parameters:p,pixel(encoded){
  if(p.identity)return encoded;
  const balanced=encoded.map((v,k)=>decode(v)*p.gains[k]),y=dot(W,balanced),target=evaluate(p.tone,y);
  // Remove the lifted black floor before ratio scaling; at zero use the exact
  // endpoint slope instead of an epsilon division/noisy chroma amplification.
  const scale=y>1e-12?(target-black)/y:p.tone.slopes[0];
  const toned=balanced.map(v=>black+v*scale);
  return gamut(saturation(toned,p.saturation),p.knee).map(encode);
 }};
}
// Generate matrix literals from the same numerical definition as the CPU.
const vec=a=>'vec3('+a.map(v=>Number.isInteger(v)?v.toFixed(1):String(v)).join(',')+')';
const matrix=(name,rows)=>`vec3 ${name}(vec3 p){return vec3(${rows.map(r=>'dot('+vec(r)+',p)').join(',')});}`;
const glsl=`
uniform bool uEdit2,uEditIdentity;
uniform vec3 uEditGains;
uniform float uEditSaturation,uEditKnee;
uniform vec4 uEditCurve[8];
const float EDIT_X[9]=float[9](${X.map(v=>Number.isInteger(v)?v.toFixed(1):String(v)).join(',')});
vec3 editDecode(vec3 p){return mix(pow((p+vec3(.055))/1.055,vec3(2.4)),p/12.92,lessThanEqual(p,vec3(.04045)));}
float editTone(float y){y=clamp(y,0.0,1.0);int k=0;for(int i=1;i<8;i++)if(y>EDIT_X[i])k=i;float t=(y-EDIT_X[k])/(EDIT_X[k+1]-EDIT_X[k]);vec4 a=uEditCurve[k];return ((a.w*t+a.z)*t+a.y)*t+a.x;}
${matrix('editM1',M1)}
${matrix('editM2',M2)}
${matrix('editI1',I1)}
${matrix('editI2',I2)}
vec3 editSaturate(vec3 p){if(uEditSaturation==1.0||max(p.r,max(p.g,p.b))-min(p.r,min(p.g,p.b))<1e-7)return p;vec3 q=editM2(pow(max(vec3(0.0),editM1(p)),vec3(1.0/3.0)));q.yz*=uEditSaturation;vec3 t=editI1(q);return editI2(t*t*t);}
vec3 editGamut(vec3 p){float y=clamp(dot(vec3(.2126,.7152,.0722),p),0.0,1.0);vec3 d=p-vec3(y);float bound=1e20;for(int k=0;k<3;k++){if(d[k]>0.0)bound=min(bound,(1.0-y)/d[k]);else if(d[k]<0.0)bound=min(bound,-y/d[k]);}float u=1.0/max(1e-20,bound),start=1.0-uEditKnee,s=u<=start?1.0:uEditKnee>0.0?(start+uEditKnee*(1.0-exp(-(u-start)/uEditKnee)))/u:1.0/u;return clamp(vec3(y)+d*s,0.0,1.0);}
vec3 editPositive(vec3 encoded){if(uEditIdentity)return encoded;vec3 p=editDecode(encoded)*uEditGains;float y=dot(vec3(.2126,.7152,.0722),p),target=editTone(y),black=uEditCurve[0].x,scale=y>1e-12?(target-black)/y:uEditCurve[0].y/EDIT_X[1];p=vec3(black)+p*scale;p=editGamut(editSaturate(p));return mix(1.055*pow(p,vec3(1.0/2.4))-vec3(.055),12.92*p,lessThanEqual(p,vec3(.0031308)));}
`;
root.NSEditing2={PROJECT_FORMAT:'negative-studio-roll-beta6-edit2',version,neutral,options,prepare,compile,curve,evaluate,lab,rgb,saturation,gamut,X,W,glsl};
})(globalThis);
