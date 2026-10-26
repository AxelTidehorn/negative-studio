import {readSource,scripts} from './source.mjs';
import vm from 'node:vm';
export function harness(){
const elements=new Map();
class Element{constructor(tag='div'){this.tagName=tag;this.value='';this.checked=false;this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};this.dataset={};this.listeners={};this.children=[];this.classList={toggle(){},add(){},remove(){}};this.clientWidth=800;this.clientHeight=600;this.textContent='';this.width=1;this.height=1;}append(...a){this.children.push(...a);}appendChild(a){this.append(a);}setAttribute(k,v){this[k]=v;}addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}setPointerCapture(){}remove(){}click(){}getContext(){return {createImageData:(w,h)=>new ImageData(w,h),putImageData:im=>{this.lastImage=im;},getImageData:()=>this.lastImage,drawImage(){},translate(){},rotate(){}};}toBlob(fn,type){fn(new Blob([this.lastImage?.data||new Uint8Array(1)],{type}));}}
class ImageData{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4);}}
const html=readSource('index.html','utf8');for(const [,id]of html.matchAll(/id="([^"]+)"/g))elements.set(id,new Element());
const context={console,performance,DecompressionStream,ImageData,Blob,TextEncoder,TextDecoder,Uint8Array,Uint8ClampedArray,Uint16Array,Float32Array,ArrayBuffer,DataView,atob,URL,setTimeout:fn=>{queueMicrotask(fn);return 0;},clearTimeout(){},confirm:()=>false,navigator:{},location:{protocol:'https:'},localStorage:{getItem(){return null;},setItem(){}},document:{getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:tag=>new Element(tag),querySelector:()=>null,body:new Element()},ResizeObserver:class{observe(){}}};
vm.createContext(context);
for(const asset of scripts.filter(a=>a.harness))vm.runInContext(readSource(asset.file,'utf8'),context,{filename:asset.source});
return {context,elements,run:js=>vm.runInContext(js,context),set:(name,value)=>{context.__input=value;vm.runInContext(name+'=__input',context);}};
}
