/* Read-only Editing 2.0 latitude probe on the ACTUAL RGB16 native exports.
   No new images, source fits or auto corrections; never loaded by production.
   node tools/v2-presentation-editing-probe.mjs PRIVATE_OUTPUT */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {decodePng} from '../tests/helpers/png.mjs';import '../src/editing/editing-engine.js';
const root=path.resolve(process.argv[2]),repo=fs.realpathSync('.');if(root===repo||root.startsWith(repo+path.sep))throw Error('Private output required');
const directory=path.join(root,'FILMLABB_V2_PRESENTATION_REVIEW'),files=fs.readdirSync(path.join(directory,'detail-crops')).filter(f=>f.endsWith('.png')).sort(),rows=[];
const cases=[['neutral',{}],['exposure+0.5',{exposure:.5}],['exposure-0.5',{exposure:-.5}],['contrast1.2',{contrast:1.2}]],decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
for(const file of files){const png=decodePng(fs.readFileSync(path.join(directory,'detail-crops',file)));assert.equal(png.bits,16);const variants={};
 for(const [name,opts]of cases){const f=NSEditing2.compile({...NSEditing2.neutral,editVersion:2,...opts}),ys=[];let low=0,high=0;
  for(let y=0;y<png.height;y+=4)for(let x=0;x<png.width;x+=4){const i=(y*png.width+x)*3,p=f.pixel([png.data[i]/65535,png.data[i+1]/65535,png.data[i+2]/65535]);assert.ok(p.every(Number.isFinite));low+=p.some(v=>Math.round(v*65535)===0);high+=p.some(v=>Math.round(v*65535)===65535);const q=p.map(decode);ys.push(.2126*q[0]+.7152*q[1]+.0722*q[2]);}
  ys.sort((a,b)=>a-b);variants[name]={samples:ys.length,quantiles:[.01,.1,.5,.9,.99],luminance:[.01,.1,.5,.9,.99].map(q=>ys[Math.floor((ys.length-1)*q)]),lowEndpointFraction:low/ys.length,highEndpointFraction:high/ys.length};
 }
 rows.push({file,variants});
}
fs.writeFileSync(path.join(directory,'measurements/editing-latitude.json'),JSON.stringify({schema:'filmlabb.presentation-editing-latitude',version:1,basis:'Existing Editing2 CPU on actual RGB16 native PNG, identical 4-pixel source grid per region; input is export-quantized rather than the app full Float64 intermediate. Endpoint means quantized RGB16 endpoint, not proof of sensor clipping.',rows},null,2)+'\n');
console.log('PASS actual RGB16 crops → existing Editing2, finite outputs and four fixed manual probes:',rows.length,'regions');
