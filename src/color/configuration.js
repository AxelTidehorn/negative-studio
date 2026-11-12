/* One per-render snapshot. Technical analysis has a separate owner. */
'use strict';
let config38=null;
function configuration38(opts=state){
 if(!['v2','calibrated4'].includes(opts.engine))throw Error('UNSUPPORTED_CONVERSION_ENGINE');
 const c={kind:opts.engine,opts:{...opts},noBase:!!opts.noBase,look:{...rollShared.look},monochrome:rollShared.monochrome,workingSpace:sourceInfo.colorSpace||'srgb'};
 if(opts.engine==='v2'){preparePlatformV2();c.v2=state.v2Recipe;c.workingSpace='rec2020';}
 else{c.cal={beta4:calibration?.beta4,base:calibration?.base};}
 return c;
}
function compiled38(opts){const c=configuration38(opts),key=JSON.stringify(c);if(!config38||config38.key!==key)config38={key,kernel:NSPixelKernel.compile(c)};return config38.kernel;}
technicalPositive=function(p,opts){return compiled38(opts).pixel(p);};
