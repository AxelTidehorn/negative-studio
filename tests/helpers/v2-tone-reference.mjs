/* Review-only common tone model. No production import or new UI mode.
   Exposure is the frozen PR #89 B exposure; reconstruction/color stay frozen. */
export const toneParameters=Object.freeze({version:'matched-shoulder-1',knee:1,blendEnd:2,power:2,photographicContrastEV:.5,neutralContrastEV:0,pivot:.8,widthEV:1});
const smoother=t=>t*t*t*(10+t*(-15+6*t));
export function contrast(y,amount){return y>0?2**(amount*Math.tanh(Math.log2(y/toneParameters.pivot)/toneParameters.widthEV)):1;}
export function tone(y,amount=toneParameters.photographicContrastEV){
 if(!(y>0))return 0;const x=y*contrast(y,amount),old=x/(1+x);
 if(x<=toneParameters.knee)return old;
 const u=4/(x+3),shoulder=1-.5*u*u;
 if(x>=toneParameters.blendEnd)return shoulder;
 const w=smoother(x-1);return old+w*(shoulder-old);
}
// Algebraic odds avoids subtracting a near-white value from one. The existing
// fast V2 kernel consumes this factor in its original scale/(1+Y*scale) stage.
export function factor(y,amount=toneParameters.photographicContrastEV){
 const c=contrast(y,amount),x=y*c;if(x<=1)return c;
 if(x>=2)return c*(x+6+1/x)/8;
 const t=tone(y,amount);return t/(y*(1-t));
}

/* Isolated review candidate. Not loaded by the application, worker or GPU.
   Render through the frozen production recipe after changing only its EV. */
export const sceneParameters=Object.freeze({version:'scene-distribution-1',maxLiftEV:1,maxLowerEV:.5,clusterEV:[.5,1.25],tailEV:[.5,1.5],rangeEV:[4,6]});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function placement(R,statistics,recipe){
 const baseline=R.exposureFromStatistics(statistics,recipe),{p10,p50,p60,p90,p99}=statistics;
 const valid=[p10,p50,p60,p90,p99].every(x=>Number.isFinite(x)&&x>0)&&p10<=p50&&p50<=p60&&p60<=p90&&p90<=p99;
 const fallback=baseline.fallback||(!valid?'INVALID_DISTRIBUTION_STATISTICS':null);
 if(fallback)return {...baseline,candidateVersion:sceneParameters.version,correctionEV:0,inference:null,candidateFallback:fallback};
 const lowerEV=Math.log2(p60)-Math.log2(p10),upperEV=Math.log2(p90)-Math.log2(p60),rangeEV=lowerEV+upperEV;
 // A concentrated upper population with a darker tail supports a modest lift;
 // the reverse supports a modest reduction. Scale invariance cannot establish
 // scene key: a narrow dark subject can be indistinguishable from bright snow.
 const support=1-smooth(...sceneParameters.rangeEV,rangeEV);
 const high=(1-smooth(...sceneParameters.clusterEV,upperEV))*smooth(...sceneParameters.tailEV,lowerEV)*support;
 const low=(1-smooth(...sceneParameters.clusterEV,lowerEV))*smooth(...sceneParameters.tailEV,upperEV)*support;
 const correctionEV=sceneParameters.maxLiftEV*high-sceneParameters.maxLowerEV*low;
 const adjusted=correctionEV===0?baseline:R.exposureFromStatistics(statistics,{...recipe,target:recipe.target*2**correctionEV});
 return {...adjusted,recipe:baseline.recipe,candidateVersion:sceneParameters.version,baselineEV:baseline.appliedEV,correctionEV,inference:{lowerEV,upperEV,rangeEV,highSupport:high,lowSupport:low,assumption:'Distribution shape only; no measured scene exposure or semantic classification'},candidateFallback:adjusted.fallback};
}
