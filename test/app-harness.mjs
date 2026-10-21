import fs from 'node:fs';import vm from 'node:vm';
export function harness(){
const elements=new Map();
class Element{constructor(tag='div'){this.tagName=tag;this.value='';this.checked=false;this.style={};this.dataset={};this.listeners={};this.children=[];this.classList={toggle(){},add(){},remove(){}};this.clientWidth=800;this.clientHeight=600;this.textContent='';this.width=1;this.height=1;}append(...a){this.children.push(...a);}appendChild(a){this.append(a);}setAttribute(k,v){this[k]=v;}addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}setPointerCapture(){}remove(){}click(){}getContext(){return {createImageData:(w,h)=>new ImageData(w,h),putImageData:im=>{this.lastImage=im;},getImageData:()=>this.lastImage,drawImage(){},translate(){},rotate(){}};}toBlob(fn,type){fn(new Blob([this.lastImage?.data||new Uint8Array(1)],{type}));}}
class ImageData{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}}
const html=fs.readFileSync('index.html','utf8');for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements.set(id,new Element());
const context={console,ImageData,Blob,TextEncoder,TextDecoder,Uint8Array,Uint8ClampedArray,Uint16Array,Float32Array,ArrayBuffer,DataView,atob,URL,setTimeout:fn=>{queueMicrotask(fn);return 0;},clearTimeout(){},confirm:()=>false,navigator:{},location:{protocol:'https:'},localStorage:{getItem(){return null;},setItem(){}},document:{getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:tag=>new Element(tag),querySelector:()=>null,body:new Element()},ResizeObserver:class{observe(){}}};
vm.createContext(context);
for(const file of ['color-engine.js','color-management.js','srgb-profile.js','pixel-kernel.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],context,{filename:'index.html'});
vm.runInContext(fs.readFileSync('beta3.js','utf8'),context,{filename:'beta3.js'});
vm.runInContext(fs.readFileSync('beta38.js','utf8'),context,{filename:'beta38.js'});
return {context,elements,run:js=>vm.runInContext(js,context),set:(name,value)=>{context.__input=value;vm.runInContext(name+'=__input',context);}};
}
