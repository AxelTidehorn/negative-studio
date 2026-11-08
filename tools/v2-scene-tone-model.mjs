/* Isolated review candidate. Not loaded by the application, worker or GPU.
   Render through the frozen production recipe after changing only its EV. */
export const parameters=Object.freeze({version:'scene-distribution-1',maxLiftEV:1,maxLowerEV:.5,clusterEV:[.5,1.25],tailEV:[.5,1.5],rangeEV:[4,6]});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function placement(R,statistics,recipe){
 const baseline=R.exposureFromStatistics(statistics,recipe),{p10,p50,p60,p90,p99}=statistics;
 const valid=[p10,p50,p60,p90,p99].every(x=>Number.isFinite(x)&&x>0)&&p10<=p50&&p50<=p60&&p60<=p90&&p90<=p99;
 const fallback=baseline.fallback||(!valid?'INVALID_DISTRIBUTION_STATISTICS':null);
 if(fallback)return {...baseline,candidateVersion:parameters.version,correctionEV:0,inference:null,candidateFallback:fallback};
 const lowerEV=Math.log2(p60)-Math.log2(p10),upperEV=Math.log2(p90)-Math.log2(p60),rangeEV=lowerEV+upperEV;
 // A concentrated upper population with a darker tail supports a modest lift;
 // the reverse supports a modest reduction. Scale invariance cannot establish
 // scene key: a narrow dark subject can be indistinguishable from bright snow.
 const support=1-smooth(...parameters.rangeEV,rangeEV);
 const high=(1-smooth(...parameters.clusterEV,upperEV))*smooth(...parameters.tailEV,lowerEV)*support;
 const low=(1-smooth(...parameters.clusterEV,lowerEV))*smooth(...parameters.tailEV,upperEV)*support;
 const correctionEV=parameters.maxLiftEV*high-parameters.maxLowerEV*low;
 const adjusted=correctionEV===0?baseline:R.exposureFromStatistics(statistics,{...recipe,target:recipe.target*2**correctionEV});
 return {...adjusted,recipe:baseline.recipe,candidateVersion:parameters.version,baselineEV:baseline.appliedEV,correctionEV,inference:{lowerEV,upperEV,rangeEV,highSupport:high,lowSupport:low,assumption:'Distribution shape only; no measured scene exposure or semantic classification'},candidateFallback:adjusted.fallback};
}
export function propose(R,intent,statistics){
 const analysis=placement(R,statistics,intent.analysis.exposure.recipe);
 // Preserve the complete color, curve, output and technical recipe, including
 // identity fallback. No parameter fitting or mutation of the baseline intent.
 return {intent:{...intent,id:intent.id+'-scene-review',exposure:analysis.appliedEV,requestedExposure:analysis.requestedEV,exposureLimited:analysis.highlightLimited||!!analysis.fallback,analysis:{...intent.analysis,exposure:analysis}},analysis};
}
