/* Research-only stage substitutions. Never imported by app-manifest/UI/workers.
   Each hypothesis changes one stage of the existing photographic-2 path. */
const V=globalThis.NSConversionV2,R=globalThis.NSV2Render,F=globalThis.NSV2Fast;
export const parameters=V.freeze({schema:'filmlabb.stage6-experiments',version:1,
 H1:{id:'stage6-white-p95-1',stage:'exposure',percentile:.95,target:3,maxDeltaEV:1},
 H2:{id:'stage6-bradford-anchor-1',stage:'positive-balance',anchor:'same qualified photographic2 terminal gains; inverse gains define partial source white',preserveY:true},
 H3:{id:'stage6-gamut095-1',stage:'output',knee:.95},
 development:['04','05','09'],checks:['00','01','02','03','06','08','10','11'],independentValidation:false});
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),mul=(m,p)=>m.map(row=>dot(row,p));
export function inverse(m){const a=m.map((r,i)=>[...r,...[0,1,2].map(j=>i===j?1:0)]);for(let c=0;c<3;c++){let p=c;for(let r=c+1;r<3;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;[a[p],a[c]]=[a[c],a[p]];if(Math.abs(a[c][c])<1e-12)throw Error('SINGULAR_MATRIX');const d=a[c][c];for(let j=0;j<6;j++)a[c][j]/=d;for(let r=0;r<3;r++)if(r!==c){const f=a[r][c];for(let j=0;j<6;j++)a[r][j]-=f*a[c][j];}}return a.map(r=>r.slice(3));}
const product=(a,b)=>a.map(r=>[0,1,2].map(c=>dot(r,b.map(row=>row[c]))));
// Published Bradford cone matrix and D65 linear Rec.2020 -> XYZ coefficients.
// Mathematical transforms, not code or fitted parameters from a converter.
export const RGB_XYZ=[[.6369580483012914,.1446169035862083,.1688809751641721],[.2627002120112671,.6779980715188708,.05930171646986196],[0,.028072693049087428,1.060985057710791]],BRADFORD=[[.8951,.2664,-.1614],[-.7502,1.7135,.0367],[.0389,-.0685,1.0296]];
export function adaptation(gains){
 if(!Array.isArray(gains)||gains.length!==3||gains.some(v=>!Number.isFinite(v)||v<=0))throw Error('ADAPTATION_GAINS_INVALID');
 const white=mul(RGB_XYZ,gains.map(v=>1/v)),target=mul(RGB_XYZ,[1,1,1]),source=white.map(v=>v/white[1]),src=mul(BRADFORD,source),dst=mul(BRADFORD,target);
 if(src.some(v=>v<=0||!Number.isFinite(v)))throw Error('ADAPTATION_WHITE_INVALID');
 const diagonal=dst.map((v,i)=>[0,1,2].map(j=>i===j?v/src[i]:0)),matrix=product(product(product(product(inverse(RGB_XYZ),inverse(BRADFORD)),diagonal),BRADFORD),RGB_XYZ);
 return {matrix,sourceWhiteXYZ:source,targetWhiteXYZ:target};
}
export function outputWithKnee(p,knee){
 if(!(knee>0&&knee<1))throw Error('GAMUT_KNEE_INVALID');let q=mul(R.matrix,p),y=Math.max(0,dot([.2126,.7152,.0722],q));if(y>=1)return [1,1,1];
 const min=Math.min(...q),lower=min<0?y/Math.max(1e-30,y-min):1;q=q.map(v=>Math.max(0,y+(v-y)*lower));
 const peak=Math.max(...q),start=Math.max(knee,y),tail=1-start,target=peak<=start?peak:start+tail*(-Math.expm1(-(peak-start)/tail)),upper=peak>y?(target-y)/(peak-y):1;return q.map(v=>y+(v-y)*upper);
}
export function compile(name,k,intent,statistics){
 const baseline=F.compile(k,intent),scratch=new Float64Array(3),stats={negativeAdaptedRGB:0,adaptationLuminanceFallback:0};
 if(name==='photo1'||name==='photo2')return {...F.compile(k,R.photographic(intent,name==='photo1'?1:2)),metadata:{id:name,stage:'baseline'},stats};
 if(name==='H1'){
  const recipe=parameters.H1,old=intent.analysis.exposure,requested=R.exposureFromStatistics({...statistics,p60:statistics.p95}, {...R.exposureRecipeFor(k.calibration),version:recipe.id,target:recipe.target}),fallback=old.fallback||requested.fallback;
  const exposure=fallback?intent.exposure:Math.max(-16,intent.exposure-recipe.maxDeltaEV,Math.min(16,intent.exposure+recipe.maxDeltaEV,requested.appliedEV));
  return {...F.compile(k,{...intent,exposure}),metadata:{...recipe,requested,appliedExposure:exposure,deltaEV:exposure-intent.exposure,fallback},stats};
 }
 if(name==='H2'){
  const model=R.prepareBalance(intent);if(model?.application!=='global-terminal')return {...baseline,metadata:{...parameters.H2,fallback:'NO_SUPPORTED_TERMINAL_ANCHOR'},stats};
  const cat=adaptation(model.gains[2]);return {stats,metadata:{...parameters.H2,...cat,gains:model.gains[2],fallback:null},pixel(r,g,b,out){
   baseline.technical(r,g,b,scratch);const p=Array.from(scratch),y=V.luminance(p);let q=mul(cat.matrix,p),qy=V.luminance(q);
   if(y<=1e-30)q=p;else if(!(qy>1e-30)){stats.adaptationLuminanceFallback++;q=R.balance(p,intent);}else q=q.map(v=>v*y/qy);
   stats.negativeAdaptedRGB+=q.some(v=>v<0);out.set(R.output(R.toneOnly(q,intent),intent));return out;
  }};
 }
 if(name==='H3')return {stats,metadata:parameters.H3,pixel(r,g,b,out){baseline.technical(r,g,b,scratch);out.set(outputWithKnee(R.render(Array.from(scratch),intent),parameters.H3.knee));return out;}};
 throw Error('EXPERIMENT_UNKNOWN');
}
