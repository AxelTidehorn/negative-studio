/* Versioned creative interpretations, not measured film-emulsion simulations.
   Display-sRGB curves and hue-dependent chroma. Legacy code stays in index.html. */
(function(root){
'use strict';
const knots=[0,.08,.18,.35,.5,.65,.8,.92,1],weights=[.2126,.7152,.0722],identity=[[1,0,0],[0,1,0],[0,0,1]],clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const definitions={
 ultramax:{label:'Roadtrip 400',tone:[0,.045,.13,.32,.53,.73,.87,.95,1],chroma:[1.10,1.08,1.16,1.05,1.22,1.12],low:[.003,0,-.006],high:[.004,0,-.004],note:'Färgstark vardagsfilm: tydliga mellantoner, friskt grönt och djupare blått. Mer stuns än Sundown.'},
 gold:{label:'Sundown 200',tone:[0,.065,.16,.37,.55,.72,.84,.93,1],chroma:[1.15,1.18,.96,.92,.92,1.07],low:[.014,.002,-.020],high:[.025,.006,-.027],note:'Varm konsumfilmsinspiration: gyllene gula och röda färger, lugnare blått och rundare högdagrar.'},
 portra:{label:'Sunday Best 400',tone:[0,.095,.205,.39,.55,.70,.83,.935,1],chroma:[.96,.94,.93,.92,.94,.95],low:[.002,0,-.003],high:[.010,.003,-.009],note:'Porträttinspiration: öppna mellantoner, återhållsamt orangeområde och mild värme. Ingen hudidentifiering.'},
 portra160:{label:'Softspoken 160',tone:[0,.115,.235,.405,.55,.69,.815,.925,1],chroma:[.89,.93,.90,.88,.91,.92],low:[0,.001,0],high:[.004,.002,-.004],note:'Lågmäld porträttfilm: lägre kontrast, diskret färg och renare neutralitet än Sunday Best.'},
 portra800:{label:'Afterhours 800',tone:[0,.045,.125,.31,.49,.68,.82,.93,1],chroma:[1.04,.99,.92,.98,1.05,1.04],low:[.016,.002,-.014],high:[.003,0,0],note:'Kvällsporträtt: tätare skuggor, varmare låga toner och mer närvaro än de mjuka porträttprofilerna. Inget simulerat korn.'},
 ektar:{label:'Chroma 100',tone:[0,.040,.115,.30,.505,.73,.875,.956,1],chroma:[1.16,1.14,1.24,1.20,1.26,1.20],low:[0,0,0],high:[.002,0,.003],note:'Färgrik landskapsinspiration: djup svärta, starkare färgseparation och tydligt grönt/blått. Mest kontrastrik färgprofil.'},
 proimage:{label:'Daylight 100',tone:[0,.070,.170,.35,.515,.675,.82,.93,1],chroma:[1.02,1.05,1.02,.99,.99,1],low:[.003,.001,-.004],high:[.008,.003,-.009],note:'Balanserad vardagsfilm: lätt värme, naturligare kontrast och små färgförskjutningar. Det lugnaste alternativet nära Neutral.'},
 fuji400:{label:'Coolside 400',tone:[0,.050,.140,.33,.515,.705,.85,.95,1],chroma:[1,.96,1.18,1.12,1.14,1.03],low:[-.014,.004,.014],high:[-.004,.004,.006],matrix:[[1,0,0],[-.020,1.020,0],[-.015,.015,1]],note:'Sval vardagsfilmsinspiration: tydligare grönt/cyan, friskare skuggor och fastare kontrast än Pale Green.'},
 fuji400h:{label:'Pale Green 400',tone:[0,.130,.255,.425,.575,.71,.83,.935,1],chroma:[.92,.90,.91,.88,.91,.92],low:[-.012,.008,.010],high:[0,.005,.002],matrix:[[1,0,0],[-.015,1.015,0],[0,.01,.99]],note:'Mjuk professionell färgfilmsinspiration: ljusare lågdagrar, pastellfärg och försiktig grön/sval ton. Den ljusaste färgprofilen.'},
 hp5:{label:'Soft Grain',type:'bw',tone:[0,.105,.225,.405,.565,.715,.84,.94,1],mono:[.26,.64,.10],note:'Dokumentärt svartvitt: öppnare skuggor och mjukt sammanhängande mellantoner. HP5-inspirerad tolkning utan kornsimulering.'},
 trix:{label:'Deep Silver',type:'bw',tone:[0,.030,.105,.285,.50,.735,.88,.96,1],mono:[.33,.57,.10],note:'Klassiskt uttrycksfullt svartvitt: djupare svärta, starkare mellantoner och ljusare rött. Tri-X-inspirerad tolkning.'},
 fp4:{label:'Fine Tone',type:'bw',tone:[0,.065,.170,.350,.535,.710,.85,.95,1],mono:[.28,.60,.12],note:'Balanserat svartvitt: rakare låga toner, tydlig detaljteckning och måttlig kontrast. FP4-inspirerad tolkning.'},
 delta100:{label:'Silver Light',type:'bw',tone:[0,.085,.195,.370,.545,.705,.825,.925,1],mono:[.23,.64,.13],note:'Rent, modernt svartvitt: tydliga mellantoner och lugnare högdagrar. Delta-inspirerad tolkning.'}
};
function resolve(legacy,id,version=2){const old=legacy[id]||legacy.generic,d=definitions[id];return version===2&&d?{...old,...d,creativeVersion:2,matrix:d.matrix||identity}:old;}
const luma=p=>p.reduce((s,v,k)=>s+v*weights[k],0);
function curve(y,values){let k=0;while(k<knots.length-2&&y>knots[k+1])k++;const t=clamp((y-knots[k])/(knots[k+1]-knots[k]));return values[k]+(values[k+1]-values[k])*t;}
function hue(p){const max=Math.max(...p),min=Math.min(...p),d=max-min;if(d<1e-12)return 0;return ((max===p[0]?(p[1]-p[2])/d:max===p[1]?2+(p[2]-p[0])/d:4+(p[0]-p[1])/d)+6)%6;}
// One common chroma scale into display gamut; never independent channel clipping.
function gamut(p,y=luma(p)){let s=1;for(const v of p){const d=v-y;if(d>0)s=Math.min(s,(1-y)/d);else if(d<0)s=Math.min(s,-y/d);}return p.map(v=>clamp(y+(v-y)*Math.max(0,s)));}
function tone(p,values){const y=luma(p),t=curve(y,values);if(y<1e-12||y>1-1e-12)return [t,t,t];const scale=Math.min(t/y,(1-t)/(1-y));return p.map(v=>clamp(t+(v-y)*scale));}
function apply(p,f,strength=1){
 if(f.type==='bw'){const g=luma(p),v=p.reduce((s,x,k)=>s+x*f.mono[k],0),styled=curve(clamp(v),f.tone),q=g+(styled-g)*clamp(strength);return [q,q,q];}
 let q=f.matrix.map(row=>row.reduce((s,v,k)=>s+v*p[k],0));q=gamut(q,clamp(luma(q)));
 const y=luma(q),h=hue(q),i=Math.floor(h),t=(1-Math.cos(Math.PI*(h-i)))/2,s=f.chroma[i]+(f.chroma[(i+1)%6]-f.chroma[i])*t;
 q=gamut(q.map(v=>y+(v-y)*s),y);q=tone(q,f.tone);
 const z=luma(q),envelope=4*z*(1-z);return gamut(q.map((v,k)=>v+envelope*((1-z)*f.low[k]+z*f.high[k])));
}
root.NSCreativeProfiles={definitions,resolve,apply,curve,knots};
})(globalThis);
