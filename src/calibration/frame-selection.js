/* One source-coordinate frame record. Detector evidence never implies consent;
   composition/export geometry is owned separately by NSGeometry. */
(function(root){
'use strict';
const D=root.NSFrameDetector,copy=q=>q.map(p=>({...p}));
function rectangle(r){return [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];}
function valid(s){
 if(!s||s.version!==1||s.coordinateSpace!=='normalized-source'||
  !['detector','manual','full'].includes(s.origin)||!['pending','automatic','confirmed'].includes(s.status)||
  typeof s.locked!=='boolean'||!D.validQuad(s.quad)||!D.validQuad(s.analysisQuad)||
  !s.analysisQuad.every(p=>D.contains(s.quad,p.x,p.y)))return false;
 if(s.detection&&!D.validRecord(s.detection))return false;
 if(s.status==='automatic'&&(s.origin!=='detector'||s.detection?.analysisSafe!==true||
  !['quad','analysisQuad'].every(k=>s[k].every((p,i)=>p.x===s.detection[k][i].x&&p.y===s.detection[k][i].y))))return false;
 if(s.rectangle&&!rectangle(s.rectangle).every((p,i)=>p.x===s.quad[i].x&&p.y===s.quad[i].y))return false;
 return !s.sourceDimensions||['width','height'].every(k=>Number.isSafeInteger(s.sourceDimensions[k])&&s.sourceDimensions[k]>0);
}
function create(quad,{origin='manual',status='pending',analysisQuad=quad,sourceDimensions,locked=false,detection}={}){return {version:1,coordinateSpace:'normalized-source',origin,status,locked,quad:copy(quad),analysisQuad:copy(analysisQuad),...(detection?{detection}:{}),...(sourceDimensions?{sourceDimensions:{...sourceDimensions}}:{})};}
// Preserve exact scalar extents for rectangular input: subtracting corner
// coordinates can change ceil/floor at a source pixel boundary. This cache is
// created atomically with the quad and never synchronized by controllers.
function rectangular(r,options={}){return {...create(rectangle(r),options),rectangle:{...r}};}
function detected(d,im){const credible=D.validRecord(d)&&D.validQuad(d.quad),quad=credible?d.quad:rectangle({x:0,y:0,w:1,h:1});return create(quad,{origin:credible?'detector':'full',status:credible&&d.analysisSafe?'automatic':'pending',analysisQuad:credible&&D.validQuad(d.analysisQuad)?d.analysisQuad:quad,detection:D.validRecord(d)?d:undefined,sourceDimensions:{width:im.width,height:im.height}});}
function matches(s,im){return valid(s)&&(!im||!s.sourceDimensions||s.sourceDimensions.width===im.width&&s.sourceDimensions.height===im.height);}
function region(s){return s?.rectangle?{...s.rectangle}:D.validQuad(s?.quad)?D.bounds(s.quad):{x:0,y:0,w:1,h:1};}
function area(s){const r=region(s);if(!valid(s))return {region:r,status:'unconfirmed'};
 // Keep rectangular sampling exactly equivalent to the established contract.
 const rectangular=rectangle(r).every(p=>s.analysisQuad.some(q=>Math.abs(p.x-q.x)<1e-12&&Math.abs(p.y-q.y)<1e-12));
 return {region:r,status:s.status==='pending'?'unconfirmed':'confirmed',...(s.status==='pending'||rectangular?{}:{polygon:copy(s.analysisQuad)})};
}
root.NSFrameSelection=Object.freeze({status:Object.freeze({confirmed:"confirmed",pending:"pending",automatic:"automatic"}),rectangle,rectangular,create,detected,valid,matches,region,area});
})(globalThis);
