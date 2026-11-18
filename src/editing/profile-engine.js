/* One positive-sRGB presentation operator; no negative/source analysis. */
(function(root){
'use strict';
const VERSION='profile-oklch-display-2',HUES=[22,54,99,142,196,250,325],clamp=x=>Math.max(0,Math.min(1,x)),X=[0,.18,.38,.6,.8,.92,1];
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const band=(x,a,b,c,d)=>smooth(a,b,x)*(1-smooth(c,d,x));
function validate(selection={id:'neutral',strength:1},monochrome=false){
 if(!selection||typeof monochrome!=='boolean'||!Number.isFinite(selection.strength)||selection.strength<0||selection.strength>1||(typeof selection.id!=='string'||selection.id!=='neutral'&&!Object.hasOwn(root.NSProfileCatalog.profiles,selection.id)))throw Error('PROFILE_SELECTION_INVALID');
 return {id:selection.id,strength:selection.strength};
}
function validateDefinition(p){
 if(p.operator!==VERSION||p.tone?.length!==9||p.tone.some((v,i)=>!Number.isFinite(v)||v<0||v>1||i>0&&v<p.tone[i-1])||p.hue?.length!==7||p.hue.some((v,i)=>v.length!==4||!v.every(Number.isFinite)||v[0]!==HUES[i])||p.chroma?.length!==7||!p.chroma.every(Number.isFinite)||[p.shadow,p.highlight].some(v=>v?.length!==2||!v.every(Number.isFinite))||!Number.isFinite(p.skinPass)||p.skinPass<0||p.skinPass>1)throw Error('PROFILE_DATA_INVALID');return p;
}
function hueValue(rows,h,column){h=(h%360+360)%360;let k=rows.length-1;for(let i=0;i<rows.length-1;i++)if(h>=rows[i][0]&&h<rows[i+1][0]){k=i;break;}const next=(k+1)%rows.length,a=rows[k][0],b=rows[next][0]+(next===0?360:0),x=h<a?h+360:h,t=(1-Math.cos(Math.PI*(x-a)/(b-a)))/2;return rows[k][column]+t*(rows[next][column]-rows[k][column]);}
function chromaValue(values,L){let k=0;while(k<5&&L>X[k+1])k++;const t=clamp((L-X[k])/(X[k+1]-X[k]));return values[k]+t*(values[k+1]-values[k]);}
function compile(selection={id:'neutral',strength:1},monochrome=false){
 const chosen=validate(selection,monochrome),id=monochrome?'neutral':chosen.id,E=root.NSEditing2,p=id==='neutral'?null:validateDefinition(root.NSProfileCatalog.profiles[id]),tone=p?E.curve(p.tone):null;
 const identity=!monochrome&&(!p||chosen.strength===0);
 function pixel(encoded){
  if(identity)return encoded;
  const lin=encoded.map(E.decode);
  if(monochrome){const gray=E.encode(E.W.reduce((s,v,k)=>s+v*lin[k],0));return [gray,gray,gray];}
  // Tone, per-lightness chroma and split toning act on every pixel, neutrals included.
  // Hue-specific terms need a defined hue, so they fade in over the first .03 of chroma.
  const lab=E.lab(lin),L=clamp(lab[0]),C=Math.hypot(lab[1],lab[2]),h=C>0?(Math.atan2(lab[2],lab[1])*180/Math.PI+360)%360:0;
  const skin=band(h,24,41,72,88)*band(C,.018,.038,.115,.170)*band(L,.20,.31,.85,.94),sp=1-skin*(1-p.skinPass),w=smooth(0,.03,C)*sp;
  const L1=clamp(E.evaluate(tone,L)+(w>0?w*hueValue(p.hue,h,3):0)),k=Math.max(0,1+sp*chromaValue(p.chroma,L)+(w>0?w*hueValue(p.hue,h,2):0)),d=w>0?w*hueValue(p.hue,h,1)*Math.PI/180:0,cs=Math.cos(d),sn=Math.sin(d);
  const sw=smooth(0,.12,L1)*(1-smooth(.3,.65,L1)),hw=smooth(.35,.75,L1)*(1-smooth(.95,1,L1));
  // Soft luminance-preserving gamut knee instead of a hard chroma clip.
  const q=E.gamut(E.rgb([L1,(cs*lab[1]-sn*lab[2])*k+sw*p.shadow[0]+hw*p.highlight[0],(sn*lab[1]+cs*lab[2])*k+sw*p.shadow[1]+hw*p.highlight[1]]),.1).map(E.encode);
  return encoded.map((v,k)=>v+chosen.strength*(q[k]-v));
 }
 return {id,strength:chosen.strength,monochrome,identity,operator:monochrome?root.NSProfileCatalog.monochrome.operator:VERSION,revision:p?.revision||1,tone,pixel,parameters:p};
}
// Reuses the Editing 2.0 GLSL matrices and transfer functions in the same pass.
const glsl=`
uniform bool uLookActive,uMonochrome;
uniform float uLookStrength,uLookSkinPass;
uniform vec4 uLookCurve[8],uLookHue[7];
uniform float uLookChroma[7];
uniform vec2 uLookShadow,uLookHighlight;
const float LOOK_H[7]=float[7](22.0,54.0,99.0,142.0,196.0,250.0,325.0);
const float LOOK_L[7]=float[7](0.0,.18,.38,.6,.8,.92,1.0);
float lookBand(float x,vec4 e){return smoothstep(e.x,e.y,x)*(1.0-smoothstep(e.z,e.w,x));}
float lookTone(float L){int k=0;for(int i=1;i<8;i++)if(L>EDIT_X[i])k=i;float t=(L-EDIT_X[k])/(EDIT_X[k+1]-EDIT_X[k]);vec4 a=uLookCurve[k];return ((a.w*t+a.z)*t+a.y)*t+a.x;}
vec3 lookHue(float h){int k=6;for(int i=0;i<6;i++)if(h>=LOOK_H[i]&&h<LOOK_H[i+1])k=i;int n=(k+1)%7;float a=LOOK_H[k],b=LOOK_H[n]+(n==0?360.0:0.0),x=h<a?h+360.0:h,t=(1.0-cos(3.141592653589793*(x-a)/(b-a)))/2.0;return mix(uLookHue[k].xyz,uLookHue[n].xyz,t);}
// Rotate the original Lab direction rather than round-tripping it through
// native sin/cos(h). Preserve exactly zero rotation and avoid driver trig error
// amplified near a dark gamut boundary. The small-angle series has error below
// 3e-13 for |d| <= .25 rad, well below float32; larger rotations use native trig.
vec2 lookRotate(vec2 ab,float d){if(d==0.0)return ab;float s,c;if(abs(d)<=.25){float t=d*d;s=d*(1.0+t*(-1.0/6.0+t*(1.0/120.0+t*(-1.0/5040.0+t/362880.0))));c=1.0+t*(-.5+t*(1.0/24.0+t*(-1.0/720.0+t/40320.0)));}else{s=sin(d);c=cos(d);}return vec2(c*ab.x-s*ab.y,s*ab.x+c*ab.y);}
vec3 lookPositive(vec3 encoded){
 if(!uLookActive&&!uMonochrome)return encoded;
 vec3 lin=editDecode(encoded);if(uMonochrome){float g=encode(dot(W,lin));return vec3(g);}
 vec3 lab=editM2(pow(max(vec3(0.0),editM1(lin)),vec3(1.0/3.0)));float L=clamp(lab.x,0.0,1.0),C=length(lab.yz),h=C>0.0?mod(degrees(atan(lab.z,lab.y))+360.0,360.0):0.0;
 float skin=lookBand(h,vec4(24.0,41.0,72.0,88.0))*lookBand(C,vec4(.018,.038,.115,.170))*lookBand(L,vec4(.20,.31,.85,.94));
 float sp=1.0-skin*(1.0-uLookSkinPass),w=smoothstep(0.0,.03,C)*sp;vec3 hv=w>0.0?w*lookHue(h):vec3(0.0);
 int k=0;for(int i=1;i<6;i++)if(L>LOOK_L[i])k=i;float t=clamp((L-LOOK_L[k])/(LOOK_L[k+1]-LOOK_L[k]),0.0,1.0),gain=max(0.0,1.0+sp*mix(uLookChroma[k],uLookChroma[k+1],t)+hv.y),L1=clamp(lookTone(L)+hv.z,0.0,1.0);
 vec2 tint=lookBand(L1,vec4(0.0,.12,.3,.65))*uLookShadow+lookBand(L1,vec4(.35,.75,.95,1.0))*uLookHighlight;
 vec3 lms=editI1(vec3(L1,lookRotate(lab.yz,radians(hv.x))*gain+tint)),q=editI2(lms*lms*lms);
 float y=clamp(dot(W,q),0.0,1.0),bound=1e20;vec3 d=q-vec3(y);for(int i=0;i<3;i++){if(d[i]>0.0)bound=min(bound,(1.0-y)/d[i]);else if(d[i]<0.0)bound=min(bound,-y/d[i]);}
 float u=1.0/max(1e-20,bound),s=u<=.9?1.0:(.9+.1*(1.0-exp(-(u-.9)/.1)))/u;q=encode3(clamp(vec3(y)+d*s,0.0,1.0));
 return encoded+uLookStrength*(q-encoded);
}
`;
root.NSProfiles={VERSION,validate,validateDefinition,compile,hueValue,chromaValue,glsl};
})(globalThis);
