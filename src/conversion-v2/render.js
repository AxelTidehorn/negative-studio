(function(root){
'use strict';
const V=root.NSConversionV2,quantile=(a,q)=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)]??0;};
function analyze(im,k){const values=[],step=Math.max(1,Math.ceil(im.width*im.height/24000));for(let p=0;p<im.width*im.height;p+=step){const r=k.pixel(V.read(im,p*3));if(!r.flags.invalid.some(Boolean)&&!r.flags.floor.some(Boolean))values.push(V.luminance(r.positive));}
 const median=quantile(values,.5),spread=quantile(values,.95)-quantile(values,.05),ok=values.length>=16&&median>0&&spread>1e-8,exposure=ok?Math.max(-1,Math.min(1,Math.log2(.18/median))):0;
 return V.freeze({schema:'RenderIntentV1',version:1,id:'tone-'+crypto.randomUUID(),analysisVersion:'full-source-stratified-1',sourceRevision:k.source.revision,calibrationId:k.calibration.id,baseId:k.base.id,status:ok?'estimated':'prior',exposure,tone:'luminance-reinhard-1',colorCorrection:{version:1,status:'prior',kind:'identity'},sampleCount:values.length,median});}
function render(p,intent){if(intent?.schema!=='RenderIntentV1'||intent.version!==1||intent.tone!=='luminance-reinhard-1'||!Number.isFinite(intent.exposure)||Math.abs(intent.exposure)>1)throw Error('RENDER_INTENT_INVALID');const e=2**intent.exposure,y=V.luminance(p)*e;return p.map(v=>v*e/(1+y));}
// Explicit output boundary: Rec.2020 -> linear sRGB, neutral-axis gamut compression,
// then peak shoulder. Technical headroom survives until here.
const matrix=[[1.6604910021084345,-.5876411387885495,-.0728498633198848],[-.1245504745215907,1.13289989712596,-.0083494226043694],[-.0181507633549052,-.1005788980080074,1.1187296613629127]];
function display(p){let q=matrix.map(r=>r.reduce((s,v,k)=>s+v*p[k],0)),y=Math.max(0,.2126*q[0]+.7152*q[1]+.0722*q[2]),min=Math.min(...q),s=min<0?y/Math.max(1e-30,y-min):1;q=q.map(v=>Math.max(0,y+(v-y)*s));const peak=Math.max(...q),target=peak<=.8?peak:.8+.2*(-Math.expm1(-(peak-.8)/.2));return q.map(v=>peak>0?v*target/peak:0);}
const encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
root.NSV2Render={analyze,render,display,encode,quantile};
})(globalThis);
