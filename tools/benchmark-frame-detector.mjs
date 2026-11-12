/* Run sequentially on frozen/candidate checkouts, without other test workloads.
   node tools/benchmark-frame-detector.mjs CHECKOUT INPUT_DIRECTORY OUTPUT */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import os from 'node:os';import crypto from 'node:crypto';import {performance} from 'node:perf_hooks';import {pathToFileURL} from 'node:url';
const [checkout,input,output]=process.argv.slice(2);if(!output)throw Error('Specify checkout, f32.gz/json directory and output');
await import(pathToFileURL(path.resolve(checkout,'src/image/image-model.js')));await import(pathToFileURL(path.resolve(checkout,'src/calibration/frame-detector.js')));
const names=fs.readdirSync(input).filter(n=>n.endsWith('.f32.gz')).sort(),rows=[];
for(const name of names){const meta=JSON.parse(fs.readFileSync(path.join(input,name.replace('.f32.gz','.json')))),b=zlib.gunzipSync(fs.readFileSync(path.join(input,name))),im={...meta,data:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))},timesMs=[];let result;
 for(let i=0;i<6;i++){const t=performance.now();result=NSFrameDetector.detect(im);if(i)timesMs.push(performance.now()-t);}
 rows.push({name,width:im.width,height:im.height,sourceSHA256:crypto.createHash('sha256').update(b).digest('hex'),timesMs,result});
}
fs.writeFileSync(output,JSON.stringify({environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model},kind:'Node microbenchmark, actual bounded RAW technical previews; five warm runs after one warmup; not full-import timing',rows},null,2));console.log('DONE',rows.length);
