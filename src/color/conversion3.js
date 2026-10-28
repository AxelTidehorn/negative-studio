/* Versioned conversion experiments. Input is decoded linear transmission;
   output is a technical linear-display positive, before existing profiles/editing.
   Automatic priors are bounded hypotheses, not identified film/spectral models. */
(function(root){
'use strict';
const VERSION=1,PROJECT_FORMAT='negative-studio-roll-conversion3',ids=['curve3','density3','matrix3'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),finite=Number.isFinite;
const W=[.2126,.7152,.0722],wideW=[.2627,.678,.0593],I=[[1,0,0],[0,1,0],[0,0,1]];
const knots=[-.25,0,.18,.5,.82,1,1.5,2],prior=[0,.01,.18,.5,.77,.9,.98,1];
const density={toe:.01,slope:.98,knee:.8};density.tail=1-(density.toe+density.slope*density.knee);
const is=id=>ids.includes(id),weights=space=>space==='rec2020'?wideW:W;
function pchip(x,y){
 const n=x.length,h=x.slice(1).map((v,i)=>v-x[i]),d=h.map((v,i)=>(y[i+1]-y[i])/v),m=Array(n).fill(0);
 for(let i=1;i<n-1;i++)if(d[i-1]*d[i]>0){const a=2*h[i]+h[i-1],b=h[i]+2*h[i-1];m[i]=(a+b)/(a/d[i-1]+b/d[i]);}
 const end=(h0,h1,d0,d1)=>{const v=((2*h0+h1)*d0-h0*d1)/(h0+h1);return v*d0<=0?0:d0*d1<0&&Math.abs(v)>3*Math.abs(d0)?3*d0:v;};
 m[0]=end(h[0],h[1],d[0],d[1]);m[n-1]=end(h[n-2],h[n-3],d[n-2],d[n-3]);
 const coefficients=h.map((v,i)=>[y[i],m[i],(3*d[i]-2*m[i]-m[i+1])/v,(m[i]+m[i+1]-2*d[i])/(v*v)]);
 return {knots:[...x],values:[...y],coefficients};
}
function evaluate(curve,x){
 const k=curve.knots;if(x<=k[0])return curve.values[0];if(x>=k[k.length-1])return curve.values.at(-1);
 let j=0;while(j<k.length-2&&x>k[j+1])j++;const t=x-k[j],a=curve.coefficients[j];return clamp(((a[3]*t+a[2])*t+a[1])*t+a[0]);
}
function derivative(curve,x){let j=0;const k=curve.knots;if(x<k[0]||x>k.at(-1))return 0;while(j<k.length-2&&x>k[j+1])j++;const t=x-k[j],a=curve.coefficients[j];return (3*a[3]*t+2*a[2])*t+a[1];}
function curveResponse(confidence=1){const s=clamp(confidence);return pchip(knots,knots.map((x,i)=>clamp(x)*(1-s)+prior[i]*s));}
// Shared density coordinate, C1 exponential tails, slope <= .98. No division by RGB luminance.
function densityTone(x){if(x<0){const v=density.toe*Math.exp((density.slope/density.toe)*x);return {value:v,slope:(density.slope/density.toe)*v};}if(x<=density.knee)return {value:density.toe+density.slope*x,slope:density.slope};const tail=density.tail*Math.exp(-(density.slope/density.tail)*(x-density.knee));return {value:1-tail,slope:tail*(density.slope/density.tail)};}
function gamut(p,y,slope=1,w=W){
 y=clamp(y);const m=p[0]*w[0]+p[1]*w[1]+p[2]*w[2],d=p.map(v=>v-m);let s=slope;
 for(const v of d)if(v>0)s=Math.min(s,(1-y)/v);else if(v<0)s=Math.min(s,-y/v);
 s=Math.max(0,s);return d.map(v=>clamp(y+v*s));
}
function matrixModel(samples,w=W){
 const safe={matrix:I.map(r=>[...r]),conditionBound:1,noiseGainBound:1,kind:'identity',reason:'insufficient-signal'};
 if(samples.length<128)return safe;
 const a=samples.map(p=>p[0]-p[1]),b=samples.map(p=>p[2]-p[1]);
 const sorted=x=>[...x].sort((a,b)=>a-b),sa=sorted(a),sb=sorted(b),bounds=s=>[s[Math.floor(s.length*.05)],s[Math.floor(s.length*.95)]];
 const ba=bounds(sa),bb=bounds(sb);let ma=0,mb=0;for(let i=0;i<a.length;i++){a[i]=clamp(a[i],...ba);b[i]=clamp(b[i],...bb);ma+=a[i];mb+=b[i];}ma/=a.length;mb/=a.length;
 let c00=0,c01=0,c11=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;c00+=x*x;c01+=x*y;c11+=y*y;}c00/=a.length;c01/=a.length;c11/=a.length;
 const trace=c00+c11;if(trace<1e-7)return safe;
 // Ridge equal to half the observed trace. Never invert a raw sample covariance.
 const ridge=trace*.5,x=c00+ridge,z=c11+ridge,r=Math.hypot(x-z,2*c01),l1=(x+z+r)/2,l2=(x+z-r)/2;
 const target=Math.sqrt(l1*l2),v1=clamp(Math.sqrt(target/l1),.96,1.04),v2=clamp(Math.sqrt(target/l2),.96,1.04),theta=.5*Math.atan2(2*c01,x-z),co=Math.cos(theta),si=Math.sin(theta);
 const A=[[co*co*v1+si*si*v2,co*si*(v1-v2)],[co*si*(v1-v2),si*si*v1+co*co*v2]];
 const B=[[1-w[0],-w[2]],[-w[0],-w[2]],[-w[0],1-w[2]]],E=[[1,-1,0],[0,-1,1]];
 let D=B.map(row=>I[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*((A[k][0]-(k===0?1:0))*E[0][j]+(A[k][1]-(k===1?1:0))*E[1][j]),0)));
 const norm=Math.hypot(...D.flat()),scale=norm>.075?.075/norm:1;D=D.map(row=>row.map(v=>v*scale));const bound=Math.min(norm,.075);
 return {matrix:D.map((row,i)=>row.map((v,j)=>v+(i===j?1:0))),conditionBound:(1+bound)/(1-bound),noiseGainBound:1+bound,kind:bound<1e-10?'identity':'regularized-chroma-covariance',reason:bound<1e-10?'isotropic':'statistical-prior-not-spectral-identification',ridge,sampleCount:samples.length};
}
function coordinate(v,k,reference,auto=true){
 if(!finite(v))throw Error('Non-finite conversion source sample.');
 const d=-Math.log10(Math.max(1/65535,v));
 if(auto)return (d-reference.lo[k])/reference.spans[k];
 const corrected=reference.noBase?v*reference.light[k]:v/Math.max(1e-8,reference.base[k]);return -Math.log10(Math.max(1/65535,corrected));
}
function analyze(im,region,{comparison,base,light,noBase=false,domain='unknown'}={}){
 if(!comparison||comparison.version!==39)throw Error('Conversion 3 requires comparison calibration.');
 const reference={lo:[...comparison.lo],spans:[...comparison.spans],base:[...base],light:[...light],noBase};
 const confidence=comparison.weak||comparison.count<32?0:clamp(1-Math.max(...comparison.dark,...comparison.clipped))*Math.min(1,Math.min(...comparison.spans)/.15);
 const pixels=root.NSColorEngine.sample(im,region,.018,12000),clean=pixels.filter(p=>p.every(v=>v>8/65535&&v<.995)).map(p=>p.map((v,k)=>coordinate(v,k,reference)));
 return {version:VERSION,domain,workingSpace:im.colorSpace||'srgb',reference,confidence,curve:{kind:confidence?'bounded-common-prior':'identity',channels:[0,1,2].map(()=>curveResponse(confidence))},matrix:matrixModel(clean,weights(im.colorSpace)),samples:pixels.length};
}
function validCurve(c){
 if(!c||c.knots?.length!==8||c.values?.length!==8||c.coefficients?.length!==7||!c.knots.every((x,i)=>finite(x)&&x===knots[i])||!c.values.every((y,i)=>finite(y)&&y>=0&&y<=1&&(!i||y>=c.values[i-1])))return false;
 if(c.values[0]!==0||c.values[7]!==1)return false;
 for(let i=0;i<7;i++){
  const a=c.coefficients[i],h=knots[i+1]-knots[i];if(a?.length!==4||!a.every(finite)||Math.abs(a[0]-c.values[i])>1e-9||Math.abs(((a[3]*h+a[2])*h+a[1])*h+a[0]-c.values[i+1])>1e-9)return false;
  const slope=t=>(3*a[3]*t+2*a[2])*t+a[1],points=[0,h];if(a[3]!==0){const critical=-a[2]/(3*a[3]);if(critical>0&&critical<h)points.push(critical);}
  if(points.some(t=>slope(t)<-1e-9||slope(t)>1.7+1e-9)||i<6&&Math.abs(slope(h)-c.coefficients[i+1]?.[1])>1e-8)return false;
 }
 return true;
}
function valid(a){
 if(!a||a.version!==VERSION||typeof a.domain!=='string'||!['srgb','rec2020'].includes(a.workingSpace)||!a.reference||!['lo','spans','base','light'].every(k=>a.reference[k]?.length===3&&a.reference[k].every(v=>finite(v)&&(k==='lo'?Math.abs(v)<=1000:v>=1e-6&&v<=1000)))||typeof a.reference.noBase!=='boolean'||!finite(a.confidence)||a.confidence<0||a.confidence>1||!['identity','bounded-common-prior','measured-neutral'].includes(a.curve?.kind)||a.curve.channels?.length!==3||!a.curve.channels.every(validCurve))return false;
 const m=a.matrix?.matrix,w=weights(a.workingSpace);if(!['identity','regularized-chroma-covariance'].includes(a.matrix?.kind)||m?.length!==3||!m.every(r=>r.length===3&&r.every(finite)))return false;
 let norm=0;for(let i=0;i<3;i++){if(Math.abs(m[i][0]+m[i][1]+m[i][2]-1)>1e-9||Math.abs(w[0]*m[0][i]+w[1]*m[1][i]+w[2]*m[2][i]-w[i])>1e-9)return false;for(let j=0;j<3;j++)norm+=(m[i][j]-(i===j?1:0))**2;}
 return norm<=.075**2+1e-12&&(a.matrix.kind!=='identity'||norm<1e-18);
}
function compile(kind,a,auto=true,{identity=false}={}){
 if(!is(kind)||!valid(a))throw Error('Invalid conversion 3 calibration/version.');
 const w=weights(a.workingSpace),m=a.matrix.matrix;
 const technical=(v,k)=>coordinate(v,k,a.reference,auto);
 function present(u){
  let p;
  if(identity||kind==='curve3'&&a.curve.kind==='identity')p=u.map(v=>clamp(v));
  else if(kind==='curve3')p=u.map((v,k)=>evaluate(a.curve.channels[k],v));
  else if(kind==='density3'){const y=u[0]*w[0]+u[1]*w[1]+u[2]*w[2],tone=densityTone(y);p=gamut(u,tone.value,tone.slope,w);}
  else{const q=u.map(v=>clamp(v));if(a.matrix.kind==='identity')p=q;else{const y=q[0]*w[0]+q[1]*w[1]+q[2]*w[2];p=gamut(m.map(r=>r[0]*q[0]+r[1]*q[1]+r[2]*q[2]),y,1,w);}}
  return a.workingSpace==='rec2020'?root.NSRawInput.displayLinear(p):p;
 }
 return {technical,present,pixel:p=>present(p.map(technical))};
}
function validateProject(data){
 const v2=!!root.NSV2Platform&&data?.format===root.NSV2Platform.PROJECT_FORMAT,modern=data?.format===PROJECT_FORMAT||v2;
 if(modern&&data.conversionSchemaVersion!==VERSION)throw Error('Unsupported conversion project version.');
 const known=['log39','calibrated4','legacy','beta2','beta3','reference','density38',...ids];
 for(const f of data?.frames||[]){const o=f?.settings;if(!o)continue;
  if(o.engine!==undefined&&!known.includes(o.engine)&&!(v2&&o.engine==='v2'))throw Error('Unsupported conversion engine.');
  if(o.conversionVersion!==undefined&&o.conversionVersion!==(v2&&o.engine==='v2'?2:VERSION))throw Error('Unsupported conversion version.');
  if(is(o.engine)&&(!modern||o.conversionVersion!==(v2&&o.engine==='v2'?2:VERSION)))throw Error('Conversion 3 requires its versioned project format.');
 }
}
const glsl=`
uniform int uConversion3,uCurveIdentity3,uMatrixIdentity3,uNoBase3;
uniform vec4 uFilmCurve3[21];
uniform mat3 uConversionMatrix3;
uniform float uLegacyBlack3,uLegacyRange3;
float filmResponse3(float x,int channel){
 const float knots[8]=float[8](-.25,0.0,.18,.5,.82,1.0,1.5,2.0);
 if(x<=-.25)return 0.0;if(x>=2.0)return 1.0;
 int j=0;for(int k=1;k<7;k++)if(x>knots[k])j=k;
 float t=x-knots[j];vec4 a=uFilmCurve3[channel*7+j];return clamp(((a.w*t+a.z)*t+a.y)*t+a.x,0.0,1.0);
}
vec3 conversion3(vec3 source){
 vec3 d=-log(max(vec3(1.0/65535.0),source))/log(10.0),u;
 if(uAuto==1)u=(d-uOffset)/uResponseSpan;
 else {vec3 corrected=uNoBase3==1?source*uLight:source/max(vec3(1e-8),uBase);u=-log(max(vec3(1.0/65535.0),corrected))/log(10.0);}
 vec3 p,w=uWide==1?vec3(.2627,.678,.0593):W;
 if(uConversion3==1){p=uCurveIdentity3==1?clamp(u,0.0,1.0):vec3(filmResponse3(u.r,0),filmResponse3(u.g,1),filmResponse3(u.b,2));}
 else if(uConversion3==2){
  float y=dot(w,u),target,slope;
  if(y<0.0){target=${density.toe}*exp(${(density.slope/density.toe).toFixed(16)}*y);slope=${(density.slope/density.toe).toFixed(16)}*target;}
  else if(y<=${density.knee}){target=${density.toe}+${density.slope}*y;slope=${density.slope};}
  else{float tail=${density.tail}*exp(-${density.slope/density.tail}*(y-${density.knee}));target=1.0-tail;slope=tail*${density.slope/density.tail};}
  vec3 delta=u-vec3(y);float s=slope;
  for(int k=0;k<3;k++){if(delta[k]>0.0)s=min(s,(1.0-target)/delta[k]);else if(delta[k]<0.0)s=min(s,-target/delta[k]);}
  p=clamp(vec3(target)+delta*max(0.0,s),0.0,1.0);
 }else{
  p=clamp(u,0.0,1.0);
  if(uMatrixIdentity3==0){float y=dot(w,p);p=uConversionMatrix3*p;vec3 delta=p-vec3(dot(w,p));float s=1.0;
   for(int k=0;k<3;k++){if(delta[k]>0.0)s=min(s,(1.0-y)/delta[k]);else if(delta[k]<0.0)s=min(s,-y/delta[k]);}p=clamp(vec3(y)+delta*max(0.0,s),0.0,1.0);
  }
 }
 return uWide==1?displayWide(p):p;
}
vec3 finishConversion3(vec3 p){
 p=encode3(p);
 if(uProfile==2||uProfile==3)p=creative(p);else if(uProfile==1&&uStrength>0.0)p=mix(p,creative(p),uStrength);
 if(uPrint==1){p=clamp(p,0.0,1.0);if(uPrintShoulder!=0.0)p=p/(vec3(1.0)+uPrintShoulder*(vec3(1.0)-p));p=clamp(vec3(.5)+(p-vec3(.5))*uPrintContrast,0.0,1.0);}
 p=clamp((clamp(p,0.0,1.0)-vec3(uLegacyBlack3))/uLegacyRange3,0.0,1.0);
 if(uInvGamma!=1.0)p=pow(p,vec3(uInvGamma));p=clamp(p*uExposure*uGains,0.0,1.0);
 if(uContrast!=1.0)p=clamp(vec3(.5)+(p-vec3(.5))*uContrast,0.0,1.0);
 float y=luma(p);p=clamp(vec3(y)+(p-vec3(y))*uSaturation,0.0,1.0);
 if(uShadows!=0.0||uHighlights!=0.0){y=sat(luma(p));float sw=pow(1.0-sat(y/.65),2.0),hw=pow(sat((y-.35)/.65),2.0),a=-uShadows*sw*(1.0-y)*.7+uHighlights*hw*y*.7;p=clamp(p+vec3(a),0.0,1.0);}
 return uEdit2?editPositive(p):p;
}
`;
root.NSConversion3={density,glsl,validateProject,VERSION,PROJECT_FORMAT,ids,is,analyze,compile,valid,pchip,evaluate,derivative,curveResponse,densityTone,matrixModel,coordinate,gamut,weights};
})(globalThis);
