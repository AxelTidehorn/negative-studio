/* Shared JavaScript parameters for CPU color kernels and GPU uniforms.
   Preserve the existing formulas and evaluation order; no pixels or analysis. */
(function(root){
'use strict';
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function prepare(config){
 const o=config.opts,f=config.profile,bw=f.type==='bw',black=decode(o.shadow);
 return {
  bw,exposureGain:2**o.exposure,
  gains:bw?[1,1,1]:[Math.exp(o.temperature/180+o.tint/350),Math.exp(-o.tint/120),Math.exp(-o.temperature/180+o.tint/350)],
  inverseGamma:1/Math.max(.25,o.gamma),displayRange:Math.max(.1,o.highlight-o.shadow),
  saturation:bw?(f.creativeVersion===2?1:0):o.saturation,
  black,whiteRange:Math.max(.01,decode(o.highlight)-black)
 };
}
root.NSColorParameters={prepare};
})(globalThis);
