import assert from 'node:assert/strict';
for(const file of ['image-model.js','geometry.js','export-plan.js','presentation-sampler.js','preview-presentation.js'])await import('../'+file);
const G=NSGeometry,P=NSPresentation,V=NSPreviewPresentation;
const im={width:9,height:7,channels:4,scale:255,data:Uint8ClampedArray.from({length:9*7*4},(_,i)=>i%4===3?255:(i*37+17)%256)},prepared={pixel:i=>[im.data[i]/255,im.data[i+1]/255,im.data[i+2]/255]};let cases=0;
for(const q of [0,1,2,3])for(const fine of [-45,-15,-2,-.1,0,.1,2,15,45])for(const crop of [false,true]){
 const model=G.create(q*90);model.rotation.fineDegrees=fine;const region={x:1/9,y:1/7,w:7/9,h:5/7},context=G.contextTransform(9,7,model);
 for(const point of [{x:0,y:0},{x:9,y:7},{x:4.5,y:3.5},{x:2.13,y:5.71}]){const uv=context.forward(point),s=context.inverse(uv);assert.ok(uv.x>=-1e-12&&uv.x<=1+1e-12&&uv.y>=-1e-12&&uv.y<=1+1e-12);assert.ok(Math.abs(s.x-point.x)<1e-10&&Math.abs(s.y-point.y)<1e-10);}
 if(cases%2)model.compositionCrop={cx:-.12,cy:.04,w:.65,h:.41};
 const p=G.compositionTransform(9,7,model,{cropExportToFrame:crop,analysisFrame:region});p.sourceWidth=9;p.sourceHeight=7;
 const w=p.output.width,h=p.output.height,b=G.pixelBounds(9,7,crop?region:null),r=V.cpu(im,p,w,h,b),eg=P.plan(im,model,crop,region),expected=P.rgba(im,prepared,eg,eg,0,eg.height);
 for(let i=0;i<r.data.length;i++)assert.ok(Math.abs(r.data[i]-expected[i])<=1);
 cases++;
}
const p=G.compositionTransform(9,7,G.create());p.sourceWidth=9;p.sourceHeight=7;assert.deepEqual(V.cpu(im,p,9,7,G.pixelBounds(9,7,null)).data,im.data);
console.log('PASS',cases,'cached CPU presentation cases match export sampling, editable full-source context has exact inverse, neutral pixels remain exact');
