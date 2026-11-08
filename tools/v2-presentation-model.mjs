/* Review-only common tone model. No production import or new UI mode.
   Exposure is the frozen PR #89 B exposure; reconstruction/color stay frozen. */
export const parameters=Object.freeze({version:'matched-shoulder-1',knee:1,blendEnd:2,power:2,photographicContrastEV:.5,neutralContrastEV:0,pivot:.8,widthEV:1});
const smoother=t=>t*t*t*(10+t*(-15+6*t));
export function contrast(y,amount){return y>0?2**(amount*Math.tanh(Math.log2(y/parameters.pivot)/parameters.widthEV)):1;}
export function tone(y,amount=parameters.photographicContrastEV){
 if(!(y>0))return 0;const x=y*contrast(y,amount),old=x/(1+x);
 if(x<=parameters.knee)return old;
 const u=4/(x+3),shoulder=1-.5*u*u;
 if(x>=parameters.blendEnd)return shoulder;
 const w=smoother(x-1);return old+w*(shoulder-old);
}
// Algebraic odds avoids subtracting a near-white value from one. The existing
// fast V2 kernel consumes this factor in its original scale/(1+Y*scale) stage.
export function factor(y,amount=parameters.photographicContrastEV){
 const c=contrast(y,amount),x=y*c;if(x<=1)return c;
 if(x>=2)return c*(x+6+1/x)/8;
 const t=tone(y,amount);return t/(y*(1-t));
}
export function install(R,target){
 if(!['C','D'].includes(target))throw Error('PRESENTATION_REVIEW_TARGET');
 const previous=R.photographicScale,amount=target==='C'?parameters.photographicContrastEV:parameters.neutralContrastEV;
 R.photographicScale=y=>factor(y,amount);
 return ()=>{R.photographicScale=previous;};
}
// The probe uses the existing WebGL2 renderer, changing only its tone statement
// before shader compilation. Never loaded by the app or its workers.
export function gpuGLSL(original,target){
 if(!['C','D'].includes(target))throw Error('PRESENTATION_REVIEW_TARGET');
 const amount=target==='C'?parameters.photographicContrastEV:parameters.neutralContrastEV;
 const needle='p=v2display(p*(uV2Exposure*c/(1.0+y*c)));';
 if(!original.includes(needle))throw Error('FROZEN_GPU_TONE_OWNER_CHANGED');
 return original.replace(needle,`float x=y*c;
 ${target==='D'?'x=y;':''}
 float oldTone=x/(1.0+x),tone=oldTone;
 if(x>1.0){float u=4.0/(x+3.0),shoulder=1.0-.5*u*u;
  float t=clamp(x-1.0,0.0,1.0),w=t*t*t*(10.0+t*(-15.0+6.0*t));tone=mix(oldTone,shoulder,w);}
 p=v2display(p*(y>0.0?uV2Exposure*tone/y:0.0));`);
}
