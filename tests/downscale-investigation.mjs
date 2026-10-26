// Reproduction of #8; a known limitation, not a quality acceptance threshold.
import assert from 'node:assert/strict';import '../src/image/image-model.js';import '../src/export/export-plan.js';
const im={width:8,height:8,channels:3,scale:1,encoding:'linear',data:Float32Array.from({length:8*8*3},(_,i)=>(Math.floor(i/3)%8)%2)};
const g=NSColorEngine.exportGeometry(im,{},false),target={width:4,height:4};
const packed=NSExportPlan.pack(im,g,target,0,4),preview=NSColorEngine.preview(im,4);
assert.ok([...packed].every(v=>v===1));assert.ok([...preview.data].every(v=>v===1));
console.log('KNOWN #8: alternating columns average 0.5; current export and preview sample 1.0. No filtering change applied.');
