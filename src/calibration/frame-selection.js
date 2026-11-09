/* Current frame selection and acceptance, using the detector's normalized-source
   quadrilateral. The detector record is evidence, not user consent; cropRegion
   remains the legacy bounding rectangle, composition remains NSGeometry's job. */
(function(root){
'use strict';
const D=root.NSFrameDetector,copy=q=>q.map(p=>({...p}));
function rectangle(r){return [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];}
function matches(s,r,im){return !!r&&valid(s)&&['x','y','w','h'].every(k=>Math.abs(D.bounds(s.quad)[k]-r[k])<1e-8)&&(!im||!s.sourceDimensions||s.sourceDimensions.width===im.width&&s.sourceDimensions.height===im.height);}
function valid(s){return !!s&&s.version===1&&s.coordinateSpace==='normalized-source'&&['detector','manual','full'].includes(s.origin)&&['pending','automatic','confirmed'].includes(s.status)&&(s.status!=='automatic'||s.origin==='detector')&&D.validQuad(s.quad)&&D.validQuad(s.analysisQuad)&&s.analysisQuad.every(p=>D.contains(s.quad,p.x,p.y))&&(!s.sourceDimensions||['width','height'].every(k=>Number.isSafeInteger(s.sourceDimensions[k])&&s.sourceDimensions[k]>0));}
function create(quad,{origin='manual',status='pending',analysisQuad=quad,sourceDimensions}={}){return {version:1,coordinateSpace:'normalized-source',origin,status,quad:copy(quad),analysisQuad:copy(analysisQuad),...(sourceDimensions?{sourceDimensions:{...sourceDimensions}}:{})};}
function detected(d,im){const credible=D.validRecord(d)&&D.validQuad(d.quad),quad=credible?d.quad:rectangle({x:0,y:0,w:1,h:1});return create(quad,{origin:credible?'detector':'full',status:credible&&d.analysisSafe?'automatic':'pending',analysisQuad:credible&&D.validQuad(d.analysisQuad)?d.analysisQuad:quad,sourceDimensions:{width:im.width,height:im.height}});}
function restore(state,region,im){
 if(matches(state.frameSelection,region,im))return state.frameSelection;
 const d=state.frameDetection;
 // Old projects with confirmed/locked manual rectangles retain that decision.
 // Old uncertain detections reuse their stored proposal without redetection.
 if(!state.cropConfirmed&&!state.cropLocked&&state.cropMethod==='auto'&&D.validRecord(d)&&(!d.sourceDimensions||d.sourceDimensions.width===im.width&&d.sourceDimensions.height===im.height))return detected(d,im);
 const compatible=D.matches(d,region,im)&&state.cropMethod==='auto';
 return create(compatible?d.quad:rectangle(region),{origin:compatible?'detector':'manual',status:state.cropConfirmed||state.cropLocked?'confirmed':'pending',analysisQuad:compatible?d.analysisQuad:rectangle(region),sourceDimensions:{width:im.width,height:im.height}});
}
function area(state,region,im){const s=state.frameSelection;
 if(matches(s,region,im))return {region:{...region},status:s.status==='pending'?'unconfirmed':'confirmed',...(s.status==='pending'?{}:{polygon:copy(s.analysisQuad)})};
 if(s)return {region:{...region},status:'unconfirmed'};
 // Compatibility for earlier callers/projects; no pending new selection may
 // inherit a stale high detector confidence after a manual move.
 const a=state.cropConfirmed?{region:{...region},status:'confirmed'}:{region:{...region},status:'estimated',method:'application-frame',confidence:Number(state.cropConfidence)||0},d=state.frameDetection;
 if(state.cropMethod==='auto'&&D.matches(d,region,im)&&(d.analysisSafe||state.cropConfirmed))a.polygon=copy(d.analysisQuad);
 return a;
}
root.NSFrameSelection=Object.freeze({rectangle,create,detected,restore,valid,matches,area});
})(globalThis);
