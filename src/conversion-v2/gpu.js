/* V2 uniforms/GLSL for the existing WebGL2 renderer. CPU core/fast/render remain
   the oracle; no analysis, recipe selection, project state or image ownership. */
(function(root){
'use strict';
const V=root.NSConversionV2,R=root.NSV2Render,vec=a=>'vec3('+a.map(x=>String(x).includes('.')||String(x).includes('e')?String(x):x+'.0').join(',')+')';
function parameters(recipe){
 root.NSV2Platform.validate(recipe);const c=recipe.calibration,b=recipe.base.rgb,hi=b.map(Math.fround),balance=R.prepareBalance(recipe.intent);
 const p={version:c.version,baseHi:hi,baseLo:b.map((x,i)=>x-hi[i]),logBase:b.map(Math.log10),logFloor:c.epsilon.map(Math.log10),slope:c.responses.map(x=>x.slope),reference:c.responses.map(x=>x.referenceDensity),norm:c.version===3?c.responses.map(x=>V.logExpm1(x.referenceDensity*x.slope)):[0,0,0],densityMatrix:c.densityMatrix||[[1,0,0],[0,1,0],[0,0,1]],matrix:c.matrix,offset:c.offset,balance:!!balance,knots:balance?.knots||[0,1,2],gains:balance?.gains||[[1,1,1],[1,1,1],[1,1,1]],exposure:2**recipe.intent.exposure,photo:R.photographicVersion(recipe.intent),output:R.outputVersion(recipe.intent)};
 // WebGL highp need not preserve subnormals. Refuse unsupported numerical
 // ranges instead of silently changing a historical recipe's reconstruction.
 if(p.logFloor.some(x=>x< -30)||p.slope.some(x=>Math.fround(x)<1e-12)||c.version===3&&p.reference.some(x=>x<1e-12)||Object.values(p).flat(Infinity).some(x=>typeof x==='number'&&!Number.isFinite(Math.fround(x))))throw Error('V2_GPU_PARAMETER_PRECISION');
 return p;
}
const glsl=`
uniform bool uV2Balance,uV2Probe;
uniform int uV2Calibration,uV2Photo,uV2Output;
uniform vec3 uV2BaseHi,uV2BaseLo,uV2LogBase,uV2LogFloor,uV2Slope,uV2Reference,uV2Norm,uV2Offset,uV2Knots,uV2Gain[3];
uniform mat3 uV2DensityMatrix,uV2Matrix;
uniform float uV2Exposure;
const float V2_LN10=${Math.LN10};
const vec3 V2_W=${vec(V.weights)};
// Stable expm1 near zero; exp(x)-1 otherwise loses thin-negative information.
float v2expm1(float x){if(abs(x)<.01)return x*(1.0+x*(.5+x*(1.0/6.0+x*(1.0/24.0+x/120.0))));return exp(x)-1.0;}
float v2logexpm1(float x){if(x<=0.0)return -1e30;if(x>1.0)return x+log(1.0-pow(10.0,-x))/V2_LN10;return log(v2expm1(x*V2_LN10))/V2_LN10;}
float v2density(float j,int c){
 if(isnan(j)||isinf(j)||j<=0.0)return -uV2LogFloor[c];
 // Base hi/lo preserves the difference near T=1, where log(J)-log(B)
 // in ordinary float arithmetic loses almost all significant digits.
 float relative=((j-uV2BaseHi[c])-uV2BaseLo[c])/uV2BaseHi[c],logT;
 if(abs(relative)<.125){float z=relative/(2.0+relative),z2=z*z;logT=2.0*z*(1.0+z2*(1.0/3.0+z2*(1.0/5.0+z2/7.0)))/V2_LN10;}
 else logT=log(j)/V2_LN10-uV2LogBase[c];
 return -max(uV2LogFloor[c],logT);
}
vec3 v2display(vec3 p){
 vec3 q=vec3(dot(${vec(R.matrix[0])},p),dot(${vec(R.matrix[1])},p),dot(${vec(R.matrix[2])},p));
 float y=max(0.0,luma(q));if(uV2Output>=2&&y>=1.0)return vec3(1.0);
 float lo=min(q.r,min(q.g,q.b)),lower=lo<0.0?y/max(1e-30,y-lo):1.0;q=max(vec3(0.0),vec3(y)+(q-vec3(y))*lower);
 float peak=max(q.r,max(q.g,q.b));
 if(uV2Output==1){float target=peak<=.8?peak:.8+.2*(-v2expm1(-(peak-.8)/.2));return peak>0.0?q*target/peak:vec3(0.0);}
 float start=max(${R.outputRecipe.knee},y),tail=1.0-start,target=peak<=start?peak:start+tail*(-v2expm1(-(peak-start)/tail)),upper=peak>y?(target-y)/(peak-y):1.0;
 q=vec3(y)+(q-vec3(y))*upper;
 if(uV2Output==3){
  float hi=max(q.r,max(q.g,q.b)),low=min(q.r,min(q.g,q.b)),s=hi>0.0?(hi-low)/(hi+low):0.0;
  float color=smoothstep(.04,.14,s)*(1.0-smoothstep(.55,.85,s)),mid=smoothstep(.02,.12,y)*(1.0-smoothstep(.40,.65,y));
  float gain=1.0+${R.presentationRecipe.saturation}*color*mid-${R.presentationRecipe.highlightChroma}*smoothstep(.30,.60,y)*(1.0-smoothstep(.10,.30,s));
  if(gain>1.0){float bound=1e30;for(int c=0;c<3;c++){if(q[c]>y)bound=min(bound,(1.0-y)/(q[c]-y));else if(q[c]<y)bound=min(bound,y/(y-q[c]));}float room=max(0.0,bound-1.0),delta=gain-1.0;gain=room>0.0?1.0+delta/(1.0+delta/room):1.0;}
  q=vec3(y)+(q-vec3(y))*gain;
 }return q;
}
vec3 v2technical(vec3 j){
 vec3 d=vec3(v2density(j.r,0),v2density(j.g,1),v2density(j.b,2)),v;
 if(uV2Calibration==3){vec3 x=uV2DensityMatrix*d*uV2Slope;v=clamp(vec3(v2logexpm1(x.r),v2logexpm1(x.g),v2logexpm1(x.b))-uV2Norm,-20.0,20.0);}
 else v=(d-uV2Reference)*uV2Slope;
 return .18*pow(vec3(10.0),clamp(uV2Matrix*v+uV2Offset,-20.0,20.0));
}
vec3 v2positive(vec3 j){
 vec3 p=v2technical(j);if(uV2Probe)return p;
 if(uV2Balance){float y=dot(V2_W,p);if(y>1e-30){int band=y<uV2Knots.y?0:1;float t=clamp((y-uV2Knots[band])/(uV2Knots[band+1]-uV2Knots[band]),0.0,1.0);t=t*t*(3.0-2.0*t);p*=mix(uV2Gain[band],uV2Gain[band+1],t);p*=y/dot(V2_W,p);}}
 float y=dot(V2_W,p)*uV2Exposure,c=1.0;
 if(uV2Photo!=0&&y>0.0){float z=log2(y/${R.photographicRecipe.pivot})/${R.photographicRecipe.widthEV.toFixed(1)};float th=z>=0.0?1.0-2.0/(exp(2.0*z)+1.0):2.0/(exp(-2.0*z)+1.0)-1.0;c=exp2(${R.photographicRecipe.maxEV}*th);}
 p=v2display(p*(uV2Exposure*c/(1.0+y*c)));
 for(int k=0;k<3;k++)p[k]=p[k]<=.0031308?12.92*p[k]:1.055*pow(p[k],1.0/2.4)-.055;
 return p;
}
`;
root.NSV2GpuMath={parameters,glsl,version:'v2-gpu-reconstruction-1'};
})(globalThis);
