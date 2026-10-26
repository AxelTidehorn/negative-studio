'use strict';
// -------- Negative Studio 0.6: roll coordinator --------
// v0.9: film models are intentionally modest, bounded mathematical hypotheses.
// Source data: Kodak E-4050 / E-7022 characteristic and spectral-dye curves; RawPedia;
// darktable Negadoctor. Manufacturer graphs are NOT RGB calibration matrices.
// Stock differences below are provisional look hypotheses, not spectrophotometric matches.
const filmProfiles={
 generic:{label:'Generisk C-41',type:'color',gamma:[1,1,1],mix:0,matrix:[[1,0,0],[0,1,0],[0,0,1]],sat:1,curve:1,toe:0,shoulder:0,lift:0,note:'Neutral C-41-bas. Avsedd som jämförelseprofil utan tydlig smak.'},
 ultramax:{label:'Roadtrip 400',type:'color',gamma:[1.03,1.0,1.02],mix:.028,matrix:[[1.08,-0.03,-0.02],[-0.01,1.03,-0.02],[-0.05,0.01,1.12]],sat:1.12,curve:1.04,toe:.04,shoulder:.03,lift:.006,shadowTint:[1.05,1.0,.96],highlightTint:[1.03,1.0,.99],note:'Roadtrip: lite varmare, punchigare och något mer mättad.'},
 gold:{label:'Sundown 200',type:'color',gamma:[1.04,1.0,1.02],mix:.035,matrix:[[1.11,-0.05,-0.02],[-0.02,1.03,-0.01],[-0.08,0.01,1.07]],sat:1.13,curve:1.05,toe:.05,shoulder:.04,lift:.008,shadowTint:[1.07,1.01,.95],highlightTint:[1.05,1.02,.98],note:'Sundown: tydligt varmare gul/röd bias och lite mer klassisk konsumfilmskänsla.'},
 portra:{label:'Sunday Best 400',type:'color',gamma:[.99,.995,1.0],mix:.01,matrix:[[1.03,-0.01,-0.02],[0.0,1.0,0.0],[-0.02,0.0,1.02]],sat:.95,curve:.98,toe:.02,shoulder:.08,lift:.01,shadowTint:[1.01,1.0,.99],highlightTint:[1.03,1.0,.99],note:'Sunday Best: mjukare kontrast, något lugnare mättnad och mild värme.'},
 portra160:{label:'Softspoken 160',type:'color',gamma:[.985,.995,1],mix:.008,matrix:[[1.02,0,-0.02],[0,1,0],[-0.015,0,1.015]],sat:.92,curve:.97,toe:.02,shoulder:.10,lift:.012,shadowTint:[1.01,1.0,1.0],highlightTint:[1.02,1.0,.99],note:'Softspoken: renare och lite mjukare, lägre mättnad än UltraMax/Gold.'},
 portra800:{label:'Afterhours 800',type:'color',gamma:[1.01,1,1.005],mix:.015,matrix:[[1.05,-0.02,-0.02],[-0.01,1.01,0],[-0.03,0,1.04]],sat:.98,curve:1.01,toe:.05,shoulder:.06,lift:.012,shadowTint:[1.03,1.0,.98],highlightTint:[1.02,1.0,1.0],note:'Afterhours: något grövre, lite tätare skuggor men fortfarande relativt mild.'},
 ektar:{label:'Chroma 100',type:'color',gamma:[1.05,1.01,1.03],mix:.04,matrix:[[1.12,-0.04,-0.03],[-0.01,1.05,-0.03],[-0.03,0.0,1.15]],sat:1.2,curve:1.08,toe:.03,shoulder:.02,lift:.003,shadowTint:[1.03,1.0,.97],highlightTint:[1.01,1.0,1.02],note:'Chroma: mest färgstark och krispig av profilerna.'},
 proimage:{label:'Daylight 100',type:'color',gamma:[1.015,1,1.01],mix:.016,matrix:[[1.05,-0.02,-0.02],[-0.01,1.01,-0.01],[-0.03,0,1.04]],sat:1.02,curve:1.0,toe:.03,shoulder:.04,lift:.007,shadowTint:[1.03,1.0,.99],highlightTint:[1.02,1.0,1.0],note:'Daylight: ren, lätt varm och ganska neutral.'},
 fuji400:{label:'Coolside 400',type:'color',gamma:[1.0,1.0,1.02],mix:.018,matrix:[[0.99,0.01,0],[-0.01,1.03,-0.01],[-0.02,-0.01,1.08]],sat:1.0,curve:1.0,toe:.03,shoulder:.05,lift:.006,shadowTint:[.99,1.01,1.03],highlightTint:[.99,1.0,1.02],note:'Coolside: svalare cyan/blå dragning och friskare grönt.'},
 fuji400h:{label:'Pale Green 400',type:'color',gamma:[.99,1.0,1.03],mix:.014,matrix:[[0.98,0.015,0.005],[-0.01,1.03,-0.01],[-0.01,-0.015,1.09]],sat:.94,curve:.98,toe:.02,shoulder:.08,lift:.012,shadowTint:[.99,1.01,1.04],highlightTint:[1.0,1.01,1.03],note:'Pale Green: svalare, mjukare och mer pastellig Fuji-tolkning.'},
 hp5:{label:'Ilford HP5 Plus',type:'bw',bwCurve:.94,bwLift:.012,note:'HP5 Plus: mjukare lågdagrar, experimentell tonåtergivning – ej kalibrerad mot framkallare.'},
 trix:{label:'Kodak Tri-X 400',type:'bw',bwCurve:1.12,bwLift:-.008,note:'Tri-X 400: distinktare mellantoner, experimentell tonåtergivning – ej kalibrerad.'},
 fp4:{label:'Ilford FP4 Plus',type:'bw',bwCurve:1.02,bwLift:.005,note:'FP4 Plus: balanserad tonrespons; experimentell grundkurva.'},
 delta100:{label:'Ilford Delta 100',type:'bw',bwCurve:.98,bwLift:.008,note:'Delta 100: mjuka mellantoner, experimentell grundkurva.'},
 bw:{label:'Svartvitt · neutral',type:'bw',gamma:[1,1,1],mix:0,matrix:[[1,0,0],[0,1,0],[0,0,1]],sat:0,curve:1,toe:0,shoulder:0,lift:0,note:'Svartvit densitetskonvertering utan simulering av korn eller specifik svartvit film.'}
};
const printStyles={neutral:{label:'Neutral',contrast:1,shoulder:0},soft:{label:'Mjuk',contrast:.90,shoulder:.20},classic:{label:'Klassisk',contrast:1.10,shoulder:0}};
function syncEngineSelector(){
 const select=$('engineMode'),names={legacy:'Äldre projekt · Beta 1',beta2:'Äldre projekt · densitet',beta3:'Äldre projekt · Beta 3',reference:'Äldre projekt · 3.7',density38:'Äldre projekt · 3.8'};
 if(typeof select.querySelectorAll==='function')for(const o of select.querySelectorAll('option[data-legacy]'))o.remove();
 if(names[state.engine]){const o=document.createElement('option');o.value=state.engine;o.textContent=names[state.engine];o.dataset.legacy='true';select.append(o);}
 select.value=state.engine;
 if(typeof document.querySelectorAll==='function')for(const el of document.querySelectorAll('[data-legacy-slope]'))el.hidden=state.engine!=='density38';
}
function activeFilmProfile(opts=state){return NSCreativeProfiles.resolve(filmProfiles,rollShared.profile,opts.engine==='reference'?1:rollShared.profileVersion);}
function applyEmulsion(p){const f=activeFilmProfile();
 if(f.creativeVersion===2)return NSCreativeProfiles.apply(p,f,f.type==='bw'?rollShared.strength:1);
 if(f.type==='bw'){
  const gray=clamp(.2126*p[0]+.7152*p[1]+.0722*p[2],0,1);const shaped=clamp(Math.pow(gray,1/Math.max(.7,f.bwCurve||1))+(f.bwLift||0),0,1);return [shaped,shaped,shaped];
 }
 const matrix=f.matrix||[[1,0,0],[0,1,0],[0,0,1]];
 let q=[
  clamp(matrix[0][0]*p[0]+matrix[0][1]*p[1]+matrix[0][2]*p[2],0,1),
  clamp(matrix[1][0]*p[0]+matrix[1][1]*p[1]+matrix[1][2]*p[2],0,1),
  clamp(matrix[2][0]*p[0]+matrix[2][1]*p[1]+matrix[2][2]*p[2],0,1)
 ];
 let lum=.2126*q[0]+.7152*q[1]+.0722*q[2];
 q=q.map((v,c)=>Math.pow(clamp(v+(v-lum)*(f.mix||0),0,1),1/(f.gamma?.[c]||1)));
 lum=.2126*q[0]+.7152*q[1]+.0722*q[2];
 if(f.sat&&f.sat!==1)q=q.map(v=>clamp(lum+(v-lum)*f.sat,0,1));
 lum=.2126*q[0]+.7152*q[1]+.0722*q[2];
 if(f.shadowTint){const w=Math.pow(1-lum,1.15);q=q.map((v,c)=>clamp(v*(1+((f.shadowTint[c]||1)-1)*w),0,1));}
 if(f.highlightTint){const w=Math.pow(lum,1.35)*.75;q=q.map((v,c)=>clamp(v*(1+((f.highlightTint[c]||1)-1)*w),0,1));}
 q=q.map(v=>{v=clamp(v+(f.lift||0),0,1);if(f.shoulder)v=v/(1+f.shoulder*(1-v));if(f.toe)v=Math.pow(v,1/(1+f.toe));if(f.curve&&f.curve!==1)v=Math.pow(clamp(v,0,1),1/f.curve);return clamp(v,0,1)});
 return q;
}
function applyPrint(p){const f=printStyles[rollShared.print]||printStyles.neutral;return p.map(v=>{v=clamp(v,0,1);if(f.shoulder)v=v/(1+f.shoulder*(1-v));return clamp(.5+(v-.5)*f.contrast,0,1)});}
function refreshProfileInfo(){const f=activeFilmProfile();
 $('profileEvidence').textContent=f.note+(rollShared.profileVersion===1?' · Äldre profil bevarad. Byt profil för den nya tolkningen.':' · Kreativ tolkning, inte en uppmätt filmsimulering.');
 $('profileTypeNote').textContent=f.type==='bw'?'Svartvitt: färgkorrigering av positivet är avaktiverad; negativets densitet används.':'Färg: basprofil + valfri positiv återgivning. Profilerna är experimentella.';
 document.body.classList.toggle('bw-active',f.type==='bw');
}
