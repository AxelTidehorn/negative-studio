import assert from 'node:assert/strict';
for(const n of ['image/image-model','conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/output','conversion-v2/diagnostics'])await import('../src/'+n+'.js');
const V=NSConversionV2,R=NSV2Render,O=NSV2Output,area={region:{x:0,y:0,w:1,h:1},status:'confirmed'},cols=80,rows=80,n=cols*rows;
function fixture({dominant=false,conflict=false}={}){
 const positive=new Float64Array(n*3),luma=new Float64Array(n),mask=new Uint8Array(n).fill(1);
 for(let i=0;i<n;i++){
  const y=.01+((i*37)%n)/n*.9,anchor=dominant||i%5<3,u=conflict&&y>.6?-.9:-.2,v=conflict&&y>.6?-.6:.5;
  let p=anchor?[2**u,1,2**v]:i%2?[1.8,.6,.25]:[.25,1.2,.4];const s=y/V.luminance(p);p=p.map(c=>c*s);positive.set(p,i*3);luma[i]=y;
 }return {positive,luma,mask};
}
const a=fixture(),c=R.estimateBalance(a.positive,a.luma,a.mask,cols,rows,area);
assert.equal(c.kind,'neutral-anchor-bands');assert.equal(c.status,'estimated');assert.ok(c.evidence.every(e=>e.tiles>=4));assert.ok(c.gains.flat().every(g=>Math.abs(Math.log2(g))<=.6+1e-12));
const i={schema:'RenderIntentV1',version:1,tone:'luminance-reinhard-1',exposure:2,colorCorrection:c},identity={...i,colorCorrection:{kind:'identity'}};
let maxError=0;
for(let p=0;p<n;p++){
 const input=Array.from(a.positive.subarray(p*3,p*3+3)),balanced=R.balance(input,i);assert.ok(Math.abs(V.luminance(input)-V.luminance(balanced))<1e-14);assert.ok(balanced.every(v=>Number.isFinite(v)&&v>0));
 if(p%5<3&&a.luma[p]>.3)assert.ok(Math.abs(Math.log2(balanced[2]/balanced[1]))<.5,'reduce observed blue cast on supported anchors');
 for(const mode of ['fixed','technical'])assert.deepEqual(R.view(input,i,mode),R.view(input,identity,mode));
}
const dominant=fixture({dominant:true});assert.equal(R.estimateBalance(dominant.positive,dominant.luma,dominant.mask,cols,rows,area).kind,'identity','single dominant colored surface must abstain');
const conflict=fixture({conflict:true});assert.equal(R.estimateBalance(conflict.positive,conflict.luma,conflict.mask,cols,rows,area).reason,'BAND_DISAGREEMENT');
assert.equal(R.estimateBalance(a.positive,a.luma,a.mask,cols,rows,{...area,status:'unconfirmed'}).reason,'ANALYSIS_AREA_UNCONFIRMED');
assert.equal(R.estimateBalance(a.positive,a.luma,a.mask,cols,rows,area,false).reason,'EXPLICIT_IDENTITY');
const auto=R.areaDescriptor({...area,status:'estimated',method:'application-frame',confidence:.68});assert.equal(auto.status,'estimated');assert.ok(R.trustedArea(auto));assert.ok(!R.trustedArea(R.areaDescriptor({...auto,confidence:.65})));assert.ok(!R.trustedArea(R.areaDescriptor({...auto,method:'unknown'})));
const rgb=[.8,.4,.2],im={width:cols,height:rows,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from(a.positive,(v,index)=>rgb[index%3]*10**-(1+.65*Math.log10(v/.18)))};
const s=V.source(im,{revision:'color-oracle'}),ctx=V.capture({session:'test',recipe:{decoder:'fixture'}}),base={...V.assumed(rgb,s,ctx),origin:'measured'},k=V.compile(s,base),before=JSON.stringify({base,cal:k.calibration}),intent=R.analyze(im,k,{analysisArea:area});assert.equal(intent.colorCorrection.kind,'neutral-anchor-bands');
for(const mode of ['auto','fixed','technical']){
 const fast=NSV2Fast.compile(k,intent,{viewMode:mode}),out=new Float64Array(3);
 for(let index=0;index<im.data.length;index+=3){const p=Array.from(im.data.subarray(index,index+3)),expected=R.view(k.pixel(p).positive,intent,mode);fast.pixel(...p,out);out.forEach((v,c)=>{maxError=Math.max(maxError,Math.abs(v-expected[c]));assert.ok(Math.abs(v-expected[c])<2e-14);});}
 for(const rotation of [0,90,180,270]){const g=O.geometry(im,{x:.1,y:.2,w:.7,h:.6},rotation,19),ref=O.rows(im,g,0,g.height,(x,y)=>O.pixel(im,k,intent,x,y,mode),16),actual=O.fastRows(im,g,0,g.height,fast.pixel,16),areaPixels=await O.area(im,g,fast.pixel,16);actual.forEach((v,j)=>assert.ok(Math.abs(v-ref[j])<=1));areaPixels.forEach((v,j)=>assert.ok(Math.abs(v-ref[j])<=1));}
}
const p=[.4,.6,.2],q=[.8,.3,.7].map(v=>v*V.luminance(p)/V.luminance([.8,.3,.7])),bp=R.balance(p,i),bq=R.balance(q,i);
assert.ok(Math.abs(Math.log2(p[0]/p[1])-Math.log2(q[0]/q[1])-(Math.log2(bp[0]/bp[1])-Math.log2(bq[0]/bq[1])))<1e-12);
const report=NSV2Diagnostics.diagnostic(im,k,intent);assert.equal(report.colorBalance.status,'estimated');assert.ok(report.statistics.balanced);assert.equal(JSON.stringify({base,cal:k.calibration}),before);
assert.notEqual(R.analysisKey(k,{analysisArea:area}),R.analysisKey(k,{analysisArea:area,colorMode:'identity'}));
for(const knot of c.knots)for(const delta of [-1e-9,1e-9]){const p=[.8,1,1.3].map(v=>v*(knot+delta)/V.luminance([.8,1,1.3]));assert.ok(R.balance(p,i).every(Number.isFinite));}
for(const input of [[0,-1,NaN],[Infinity,1e-38,1],[1.2,2,1.1]]){const fast=NSV2Fast.compile(k,intent),out=new Float64Array(3);fast.pixel(...input,out);assert.ok(out.every(Number.isFinite));const expected=R.view(k.pixel(input).positive,intent);out.forEach((v,c)=>assert.ok(Math.abs(v-expected[c])<2e-14));}
for(const knot of c.knots){const unit=[.8,1,1.3].map(v=>v/V.luminance([.8,1,1.3])),below=R.balance(unit.map(v=>v*(knot-1e-9)),i),above=R.balance(unit.map(v=>v*(knot+1e-9)),i);below.forEach((v,c)=>assert.ok(Math.abs(v-above[c])<1e-7,'continuous transitions at luminance knots'));}
assert.throws(()=>R.prepareBalance({...i,colorCorrection:{...c,knots:[0,0,1]}}),/COLOR_BALANCE_INVALID/);
console.log('PASS neutral anchors, dominant-color abstention, band conflict, frame confidence, luminance/color separation, fixed/technical identity, scalar/reference/area/export; max error',maxError);
