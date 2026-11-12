/* Filmbas 2 records contain metadata only. Older projects never opt in implicitly. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),vector=x=>Array.isArray(x)&&x.length===3&&x.every(v=>Number.isFinite(v)&&v>0&&v<=100);
function context(im,info,settings,light,flatField){
 return {version:2,encoding:im.encoding||info.encoding,domain:info.domain||info.label||'unknown',colorSpace:im.colorSpace||'srgb',decoder:info.decoder||info.rawMode4||'browser/tiff',normalization:info.normalization||im.normalization||1,gain:im.linearGain4||info.gain||null,whiteBalance:info.whiteBalance||null,light:[...light],flatField:flatField||null,session:settings.captureSession2||null};
}
const compatible=(a,b)=>!!a&&!!b&&JSON.stringify(a)===JSON.stringify(b);
function valid(a){
 return !!(a&&a.version===2&&typeof a.id==='string'&&a.context?.version===2&&vector(a.measurement?.measured)&&['auto-region','manual-region','manual-7x7'].includes(a.measurement.kind)&&['safe','review'].includes(a.measurement.status)&&a.measurement.measured.every(v=>v<=1)&&vector(a.light)&&typeof a.baseLocked==='boolean'&&typeof a.responseLocked==='boolean'&&root.NSColorCalibration?.valid(a.response));
}
function proposal(measurement,capture,revision){return {version:2,revision,context:clone(capture),measurement:clone(measurement)};}
function accept(p,current,previous,response){
 if(!p||p.version!==2||!compatible(p.context,current)||!vector(p.measurement?.measured)||p.measurement.status==='missing')throw Error('Provet saknas eller tillhör en annan källa.');
 if(previous?.baseLocked)throw Error('Lås upp filmbasen före godkännande.');
 return {version:2,id:'fb2-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),context:clone(current),measurement:clone(p.measurement),light:clone(current.light),response:clone(response||null),baseLocked:true,responseLocked:true,provenance:{method:p.measurement.kind,revision:p.revision,acceptedAt:new Date().toISOString()}};
}
function validateProject(data){
 if(data.filmBaseVersion!==undefined&&data.filmBaseVersion!==2)throw Error('Okänd filmbasversion.');
 if(data.sharedBase2&&!valid(data.sharedBase2))throw Error('Ogiltig rullreferens.');
 for(const f of data.frames||[]){const s=f.settings||{};if(s.filmBaseVersion!==undefined&&s.filmBaseVersion!==2)throw Error('Okänd filmbasversion.');if(s.acceptedCalibration2&&!valid(s.acceptedCalibration2))throw Error('Ogiltig godkänd filmbas.');}
}
root.NSFilmBaseReference={context,compatible,valid,proposal,accept,validateProject,clone};
})(globalThis);
