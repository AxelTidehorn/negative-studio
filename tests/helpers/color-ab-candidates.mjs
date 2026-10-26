/* Full-source experimental oracles. B is deliberately not a production filter. */
export const W=[.2126,.7152,.0722],clamp=v=>Math.max(0,Math.min(1,v)),lum=(p,w=W)=>p.reduce((s,v,k)=>s+v*w[k],0);
export function confidence(source){const t=clamp(Math.log2(64/(65535*Math.max(1/65535,Math.min(...source))))/4);return t*t*(3-2*t);}
export function density(source,a){return source.map((v,k)=>(-Math.log10(Math.max(1/65535,v)*a.light[k]/a.base[k])-a.response.offset[k])/a.response.span[k]);}
export function positive(p,a,auto){return p.map(v=>Math.max(0,auto?(v-a.lo)/a.span:v));}
export function gamut(p,y,w=W){const m=Math.min(...p),s=m<0?y/(y-m):1;return p.map(v=>y+(v-y)*s);}
export function robust(source,a,auto,w=W){
 const p=positive(density(source,a),a,auto),fade=.5*confidence(source);if(!fade)return p;
 const y=lum(p,w),scale=auto?a.span:1;
 const start=positive(density([64/65535,64/65535,64/65535],a),a,auto),range=a.response.span.map(v=>Math.log10(16)/v/scale);
 const cap=(x,k)=>{const d=Math.max(0,x-start[k]);return x-d-range[k]*Math.expm1(-d/range[k]);};
 const residual=p.map((v,k)=>cap(v,k)-cap(y,k)),mean=lum(residual,w),candidate=gamut(residual.map(v=>y+v-mean),y,w);
 return p.map((v,k)=>v+fade*(candidate[k]-v));
}
export function localChroma(source,width,height,a,auto){
 const coords=source.map(p=>positive(density(p,a),a,auto)),out=coords.map(p=>p.slice());
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=coords[i],l=lum(p),neighbours=[];
  for(let yy=Math.max(0,y-1);yy<=Math.min(height-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(width-1,x+1);xx++){
   const q=coords[yy*width+xx],ll=lum(q);if(Math.abs(ll-l)<.025)neighbours.push([q[0]-ll,q[2]-ll]);
  }
  if(neighbours.length<5)continue;
  const median=k=>neighbours.map(v=>v[k]).sort((a,b)=>a-b)[Math.floor(neighbours.length/2)],r=median(0),b=median(1),g=-(W[0]*r+W[2]*b)/W[1];
  const d=Math.hypot(p[0]-l-r,p[2]-l-b),t=clamp((d-.02)/.08),fade=confidence(source[i])*t*t*(3-2*t),q=gamut([l+r,l+g,l+b],l);
  out[i]=p.map((v,k)=>v+fade*(q[k]-v));
 }
 return out;
}
export const fixtureCalibration={lo:0,span:1,base:[1,1,1],light:[1,1,1],response:{offset:[0,0,0],span:[4,4,4]}};
export const fixtureConfig={kind:'calibrated4',opts:{autoLevels:false,exposure:0,temperature:0,tint:0,saturation:1,shadow:0,highlight:1,gamma:1,contrast:1,shadows:0,highlights:0,toneMode4:'smooth'},profile:{type:'color'},print:{},neutralProfile:true,neutralPrint:true,strength:0,cal:{beta4:fixtureCalibration}};
export function field(kind,width=31,height=23){
 const source=[],clean=[];for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const grain=.012*Math.sin(x*1.31+y*2.17),neutral=.99+grain;
  let p=kind==='cyan'?[.82+grain,.96+grain,1.02+grain]:kind==='edge'?(x<width/2?[.8,.98,1.05]:[1.05,.98,.8]):[neutral,neutral,neutral+(kind==='neutral'?0:.025)];
  if(kind==='thin'&&x===Math.floor(width/2))p=[neutral+.12,neutral-(W[0]+W[2])*.12/W[1],neutral+.12];
  const raw=p.map(v=>10**(-4*v));clean.push(raw);
  const noisy=raw.slice();
  if(kind==='neutral'||kind==='weak-blue'||kind==='cyan')noisy[2]=Math.max(0,noisy[2]+(((x*17+y*31)%7)-3)/65535);
  if(kind==='specks'&&(x+7*y)%41===0)noisy[2]=1/65535;
  source.push(noisy);
 }
 return {width,height,source,clean};
}
