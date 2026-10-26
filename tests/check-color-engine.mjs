import assert from 'node:assert/strict';
import '../src/image/image-model.js';
import '../src/import/color-management.js';
import '../src/import/srgb-profile.js';
const C=globalThis.NSColorEngine;
let count=0;function test(name,fn){fn();console.log('PASS',name);count++;}
const region={x:.2,y:.2,w:.6,h:.6},shape=[1,.58,.29];
function image(gain=1,border=1){const w=100,h=80,data=new Float32Array(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const inside=x>=20&&x<80&&y>=16&&y<64,u=(x-20)/60*.8+(y-16)/48*.1;const p=inside?shape.map((s,c)=>gain*.65*s*10**(-(.08+u+[.02,0,.035][c]))):[border,border,border];data.set(p,(y*w+x)*3);}return {data,width:w,height:h,channels:3,encoding:'linear'};}
const base={shape,kind:'manual',confidence:1};
const opts={base};
test('Pixels outside ROI do not affect technical analysis',()=>{const a=C.analyze(image(1,.01),region,opts),b=C.analyze(image(1,.95),region,opts);assert.deepEqual(a,b);});
test('Crop changes refresh density and tone statistics',()=>{const im=image();const a=C.analyze(im,region,opts),b=C.analyze(im,{x:.2,y:.2,w:.3,h:.6},opts);assert.ok(Math.abs(a.hi-b.hi)>.1);assert.notEqual(a.count,b.count);});
test('Scan exposure invariance at -1, 0 and +0.4 EV without clipping',()=>{const im=image(),a=C.analyze(im,region,opts),p=C.pixel(im,45,35),q=C.positive(p,a);for(const g of [.5,2**.4]){const b=C.analyze(image(g),region,opts),out=C.positive(p.map(v=>v*g),b);out.forEach((v,c)=>assert.ok(Math.abs(v-q[c])<2e-6));}});
test('sRGB and linear inputs agree',()=>{const a=image(),b={...a,encoding:'srgb',data:Float32Array.from(a.data,C.encode)},ca=C.analyze(a,region,opts),cb=C.analyze(b,region,opts);assert.ok(Math.abs(ca.lo-cb.lo)<1e-6);assert.ok(Math.abs(ca.hi-cb.hi)<1e-6);});
test('No grey-world or channel-range neutralization',()=>{const im=image();for(let i=0;i<im.data.length;i+=3)im.data[i+1]*=.6;const cal=C.analyze(im,region,opts),p=C.positive(C.pixel(im,40,30),cal);assert.ok(p[1]>p[0]);assert.deepEqual(cal.balance,[0,0,0]);});
test('White external light is never accepted as orange film base',()=>assert.equal(C.findBase(image(1,.92),region),null));
test('Black border never accepted as base',()=>assert.equal(C.findBase(image(1,.001),region),null));
test('No base reports fallback explicitly',()=>assert.equal(C.analyze(image(),region,{noBase:true}).base.kind,'fallback'));
test('Shared base corrects both image and base for light gains',()=>{const im=image(),g=[.8,1.2,1.4],a=C.analyze(im,region,{base}),b=C.analyze(im,region,{base,light:g}),p=C.pixel(im,42,33);C.positive(p,a).forEach((v,c)=>assert.ok(Math.abs(v-C.positive(p,b)[c])<1e-6));});
test('Preview sample matches full-resolution export calculation',()=>{const im=image(),pre=C.preview(im,50),cal=C.analyze(pre,region,opts);for(let y=5;y<30;y+=5)for(let x=6;x<40;x+=6){const sx=Math.floor((x+.5)*im.width/pre.width),sy=Math.floor((y+.5)*im.height/pre.height),a=C.positive(C.pixel(pre,x,y),cal),b=C.positive(C.pixel(im,sx,sy),cal);assert.deepEqual(a,b);}});
test('Rotation/crop geometry has correct pixels and dimensions',()=>{const im={width:10,height:8},r={x:.2,y:.25,w:.6,h:.5},g=C.exportGeometry(im,r,true,90);assert.equal(g.width,4);assert.equal(g.height,6);assert.deepEqual(g.at(0,0),[2,5]);assert.deepEqual(g.at(3,5),[7,2]);assert.equal(C.exportGeometry(im,r,false,270).height,10);});
test('sRGB export ICC profile roundtrip',()=>{const p=NSColorManagement.parseICC(NSSRGBProfile);for(const v of [[0,0,0],[1,1,1],[.3,.5,.7]])p.toLinear(v).forEach((x,c)=>assert.ok(Math.abs(x-C.decode(v[c]))<.0003));});
test('Malformed ICC fails instead of silently ignoring color',()=>assert.throws(()=>NSColorManagement.parseICC(new Uint8Array(144))));
test('Detector returns a bounded rectangle with uncertainty',()=>{const d=C.detectFrame(image());assert.ok(d.region.x>=0&&d.region.w>0&&d.region.x+d.region.w<=1);assert.ok(d.confidence>=0&&d.confidence<=1);});
console.log(`${count} engine checks passed`);
