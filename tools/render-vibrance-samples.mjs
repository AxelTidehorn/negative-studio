/* Reproducible manual-edit comparisons. Input, if supplied, is an already rendered
   positive RGB8 P6 PPM, never a RAW or a second negative-conversion pipeline. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import '../src/editing/editing-engine.js';
const E=NSEditing2,levels=[0,30,60,-30],[input,output='docs/vibrance']=process.argv.slice(2),opts={...E.neutral,editVersion:2};fs.mkdirSync(output,{recursive:true});
if(input){
 const buffer=fs.readFileSync(input),header=/^P6\s+(\d+)\s+(\d+)\s+255\r?\n/.exec(buffer.subarray(0,100).toString('latin1'));if(!header)throw Error('Expected a positive binary P6 RGB8 PPM');
 const pixels=buffer.subarray(header[0].length),width=Number(header[1]),height=Number(header[2]);if(pixels.length!==width*height*3)throw Error('PPM size mismatch');
 for(const vibrance of levels){const edit=E.compile({...opts,vibrance}),out=Buffer.alloc(pixels.length);for(let i=0;i<pixels.length;i+=3){const q=edit.pixel([pixels[i]/255,pixels[i+1]/255,pixels[i+2]/255]);for(let c=0;c<3;c++)out[i+c]=Math.round(q[c]*255);}if(vibrance===0&&!out.equals(pixels))throw Error('Neutral comparison changed pixels');fs.writeFileSync(path.join(output,'v'+vibrance+'.ppm'),Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`),out]));}
 fs.writeFileSync(path.join(output,'recipe.json'),JSON.stringify({inputDomain:'encoded-srgb-rgb8-positive',width,height,inputSha256:createHash('sha256').update(buffer).digest('hex'),recipe:E.vibranceRecipe,options:opts,levels},null,2));
}else{
 const swatches=[['Grå',[.5,.5,.5]],['Nästan neutral',[.7,.7001,.6999]],['Hudliknande ljus',[.78,.57,.45]],['Hudliknande mörk',[.48,.30,.22]],['Himmel',[.38,.65,.85]],['Grönt',[.22,.53,.25]],['Mättat rött',[.95,.06,.02]],['Mättat blått',[.03,.05,.95]],['Svagt varm högdager',[.95,.94,.93]]],width=1040,height=100+swatches.length*56,items=[];
 items.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Samma sRGB-färgprover med lyster 0, +30, +60 och -30"><rect width="100%" height="100%" fill="#eeeae2"/><g font-family="sans-serif" fill="#242424"><text x="20" y="28" font-size="18">Editing 2.0 · samma färgprov och övriga inställningar</text>`);
 levels.forEach((v,j)=>items.push(`<text x="${230+j*200}" y="65" font-size="16">Lyster ${v>0?'+':''}${v}</text>`));
 swatches.forEach(([label,p],i)=>{items.push(`<text x="20" y="${113+i*56}" font-size="14">${label}</text>`);levels.forEach((v,j)=>{const q=E.compile({...opts,vibrance:v}).pixel(p).map(x=>Math.round(x*255));items.push(`<rect x="${215+j*200}" y="${82+i*56}" width="180" height="44" rx="2" fill="rgb(${q.join(',')})"><title>${label}, lyster ${v}: RGB ${q.join(', ')}</title></rect>`);});});
 items.push('</g></svg>');fs.writeFileSync(path.join(output,'synthetic-comparison.svg'),items.join('\n'));
}
