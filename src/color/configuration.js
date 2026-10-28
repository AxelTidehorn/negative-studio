/* One immutable per-render/export parameter snapshot; no source pixels or analysis ownership. */
'use strict';
let config38=null,technicalCache38=null;
function configuration38(opts=state){
 const kind=opts.engine==='reference'?'reference':opts.engine==='beta2'?'beta2':opts.engine==='density38'?'density38':'legacy',l=kind==='reference'?legacyLevels:beta3Levels;
 const spans=l?l.hi.map((v,c)=>Math.max(.04,v-l.lo[c])):[1,1,1];
 const c={kind,opts:{...opts},noBase:!!opts.noBase,base:base.map(v=>v/255),light:kind==='reference'?[1,1,1]:currentLight(),levels:l,spans,ref:[...spans].sort((a,b)=>a-b)[1],cal:calibration,slopes:[Number(opts.redSlope)||1,1,Number(opts.blueSlope)||1],profile:activeFilmProfile(opts),print:printStyles[rollShared.print]||printStyles.neutral,neutralProfile:rollShared.profile==='generic',neutralPrint:rollShared.print==='neutral',strength:rollShared.strength,referenceEncoding:sourceInfo.encoding};
 if(opts.engine==='log39'){c.kind='log39';c.cal={...calibration,log39:calibration?.log39||NSColorAnalysis.analyze(workingPreview,cropRegion)};}
 if(opts.engine==='calibrated4'){c.kind='calibrated4';c.workingSpace=sourceInfo.colorSpace||'srgb';c.cal={...calibration,beta4:calibration.beta4};}
 if(NSConversion3.is(opts.engine)){c.kind=opts.engine;c.workingSpace=sourceInfo.colorSpace||'srgb';c.conversion3=calibration?.conversion3||null;}
 return c;
}
function compiled38(opts){const c=configuration38(opts),key=JSON.stringify(c);if(!config38||config38.key!==key)config38={key,kernel:NSPixelKernel.compile(c)};return config38.kernel;}
technicalPositive=function(p,opts){return compiled38(opts).pixel(p);};
neutralLookup=function(opts,im){if(opts.engine==='v2'||NSConversion3.is(opts.engine)||opts.engine==='calibrated4'||NSEditing2.version(opts.editVersion)===2)return null;if(!im||im.encoding!=='linear'||im.scale!==65535||rollShared.profile!=='generic'||rollShared.print!=='neutral'||opts.saturation!==1||opts.shadows||opts.highlights)return null;const k=compiled38(opts),t=[new Uint16Array(65536),new Uint16Array(65536),new Uint16Array(65536)];for(let i=0;i<65536;i++){const p=k.pixel([i/65535,i/65535,i/65535]);for(let c=0;c<3;c++)t[c][i]=Math.round(p[c]*65535);}return t;};
function technicalTables38(config){
 if(config.kind==='v2'){technicalCache38=null;return null;}
 if(NSConversion3.is(config.kind)){
  const key=JSON.stringify(['conversion3',config.conversion3.reference,config.opts.autoLevels]);
  if(!technicalCache38||technicalCache38.key!==key)technicalCache38={key,value:NSPixelKernel.tables(NSPixelKernel.compile(config)),complete:false};
  return technicalCache38.value;
 }
 if(config.kind==='calibrated4'){
  const a=config.cal.beta4,key='beta4:'+JSON.stringify([a.response.offset,a.response.span,a.base,a.light]);
  if(!technicalCache38||technicalCache38.key!==key)technicalCache38={key,value:NSPixelKernel.tables(NSPixelKernel.compile(config)),complete:false};
  return technicalCache38.value;
 }
 const complete=(NSEditing2.version(config.opts.editVersion)!==2||NSEditing2.prepare(config.opts,config.profile.type==='bw').identity)&&config.neutralProfile&&config.neutralPrint&&config.opts.saturation===1&&!config.opts.shadows&&!config.opts.highlights;
 const key=JSON.stringify({kind:config.kind,levels:config.levels,base:config.base,light:config.light,noBase:config.noBase,cal:config.cal,slopes:config.slopes,auto:config.opts.autoLevels,balance:config.opts.balanceStrength,final:complete?config:null});
 if(!technicalCache38||technicalCache38.key!==key){const k=NSPixelKernel.compile(config),t=complete?NSPixelKernel.completeTables(config,k).map(a=>Uint16Array.from(a,v=>Math.round(v*65535))):NSPixelKernel.tables(k);technicalCache38={key,value:t,complete};}
 return technicalCache38.value;
}
