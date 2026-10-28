/* FILMLABB v2 CPU reference. No UI, geometry, legacy calibration or mutable state. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const uuid=()=>globalThis.crypto.randomUUID?.()||Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const vector=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
const weights=[.2627,.678,.0593],luminance=p=>p.reduce((s,v,c)=>s+v*weights[c],0);
const prior=freeze({schema:'CalibrationV2',version:2,id:'rec2020-common-prior-1',revision:1,origin:'prior',provisional:true,domain:'linear-rec2020',responses:[0,1,2].map(()=>({kind:'affine',slope:1/.65,referenceDensity:1})),matrix:[[1,0,0],[0,1,0],[0,0,1]],offset:[0,0,0],limits:{density:[-2,6],logPositive:[-20,20]},epsilon:[1e-8,1e-8,1e-8]});
function validateSource(s,im){
 if(!Number.isSafeInteger(s?.width)||!Number.isSafeInteger(s?.height)||s.width<1||s.height<1||s?.schema!=='SourceDescriptor'||s.version!==1||s.transfer!=='linear'||s.colorSpace!=='rec2020'||s.baseApplied!==false||s.negative!==true||!s.revision||!Number.isFinite(s.normalization)||s.normalization!==1||!Number.isFinite(s.gain)||s.gain!==1)throw Error('SOURCE_DOMAIN_UNVERIFIED');
 if(im&&(!(im.data instanceof Float32Array)||im.data.length!==s.width*s.height*3||im.width!==s.width||im.height!==s.height||im.encoding!=='linear'||im.colorSpace!=='rec2020'||(im.scale||1)!==1||(im.normalization||1)!==1||im.flatField))throw Error('SOURCE_BUFFER_INVALID');
 return s;
}
function capture({session,recipe,whiteBalance=null,light=null,flatField=null}){if(!session||!recipe)throw Error('CAPTURE_MISSING');return freeze({schema:'CaptureContext',version:1,session,recipe:clone(recipe),whiteBalance:clone(whiteBalance),light,flatField});}
function compatible(a,b){return !!a&&!!b&&JSON.stringify(a)===JSON.stringify(b);}
function source(im,{format='RAF',revision,recipe,bitDepth=16,verification='decoder'}={}){const s={schema:'SourceDescriptor',version:1,width:im.width,height:im.height,bitDepth,storage:'Float32',format,colorSpace:'rec2020',transfer:'linear',negative:true,baseApplied:false,normalization:1,gain:1,recipe:clone(recipe||null),revision,verification};validateSource(s,im);return freeze(s);}
function validateCalibration(c){
 if(c?.schema!=='CalibrationV2'||c.version!==2||!c.id||!c.revision||c.domain!=='linear-rec2020'||(!vector(c.offset)||c.offset.some(v=>Math.abs(v)>20))||!vector(c.epsilon)||c.epsilon.some(v=>v<=0||v>=1)||c.responses?.length!==3||c.responses.some(r=>r.kind!=='affine'||!Number.isFinite(r.slope)||r.slope<=0||r.slope>10||!Number.isFinite(r.referenceDensity))||c.matrix?.length!==3||!c.matrix.every(r=>vector(r)&&r.every(v=>Math.abs(v)<=2))||c.limits?.logPositive?.length!==2||c.limits.logPositive[0]!==-20||c.limits.logPositive[1]!==20||c.limits.density?.length!==2||!c.limits.density.every(Number.isFinite)||c.limits.density[0]>=c.limits.density[1])throw Error('CALIBRATION_INVALID');return c;
}
function accept(measurement,s,ctx){validateSource(s);if(measurement.status==='missing'||!vector(measurement.measured)||measurement.measured.some(v=>v<=0)||measurement.sourceRevision!==s.revision)throw Error('BASE_MEASUREMENT_INVALID');return freeze({schema:'BaseReference',version:1,id:'base-'+uuid(),revision:1,domain:'linear-rec2020',capture:clone(ctx),sourceRevision:s.revision,origin:'measured',method:measurement.kind,rgb:[...measurement.measured],measurement:clone(measurement),status:'accepted'});}
function assumed(rgb,s,ctx){if(!vector(rgb)||rgb.some(v=>v<=0))throw Error('BASE_INVALID');return freeze({schema:'BaseReference',version:1,id:'prior-base-'+uuid(),revision:1,domain:'linear-rec2020',capture:clone(ctx),sourceRevision:s.revision,origin:'prior',method:'explicit-uncalibrated',rgb:[...rgb],status:'uncalibrated'});}
function compile(s,base,cal=prior,ctx=base?.capture){
 validateSource(s);validateCalibration(cal);
 if(base?.schema!=='BaseReference'||base.version!==1||base.domain!==cal.domain||!vector(base.rgb)||base.rgb.some(v=>v<1e-12||v>1e6)||!compatible(base.capture,ctx))throw Error('BASE_INCOMPATIBLE');
 const b=freeze(clone(base)),c=freeze(clone(cal)),logBase=b.rgb.map(Math.log10),logFloor=c.epsilon.map(Math.log10);
 function pixel(j){const flags={invalid:[false,false,false],floor:[false,false,false],clipped:[false,false,false],extrapolated:[false,false,false],bounded:[false,false,false]};
  const density=j.map((v,k)=>{flags.invalid[k]=!Number.isFinite(v)||v<=0;flags.clipped[k]=Number.isFinite(v)&&v>=1;const logT=flags.invalid[k]?-Infinity:Math.log10(v)-logBase[k],floor=logFloor[k];flags.floor[k]=logT<floor;const d=-Math.max(floor,logT);flags.extrapolated[k]=d<c.limits.density[0]||d>c.limits.density[1];return d;});
  const v=density.map((d,k)=>(d-c.responses[k].referenceDensity)*c.responses[k].slope),logPositive=c.matrix.map((row,k)=>row.reduce((n,a,i)=>n+a*v[i],c.offset[k]));
  const positive=logPositive.map((v,k)=>{flags.bounded[k]=v< -20||v>20;return .18*10**Math.max(-20,Math.min(20,v));});return {density,logPositive,positive,flags};
 }
 return {pixel,source:s,base:b,calibration:c};
}
const read=(im,i)=>[im.data[i],im.data[i+1],im.data[i+2]];
root.NSConversionV2={clone,uuid,freeze,weights,luminance,prior,source,capture,compatible,validateSource,validateCalibration,accept,assumed,compile,read};
})(globalThis);
