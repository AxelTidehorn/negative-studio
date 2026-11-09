/* Keep native range values, keyboard and mouse behavior. Touch reset recognizes
   actual stationary taps, never two arbitrary drag endings. In particular no
   terminal touch event is cancelled: WebKit must finish its native control. */
(function(root){
'use strict';
if(typeof document.addEventListener!=='function')return;
const resets=new WeakMap();let active=null,lastTap=null;
function finish(e){
 if(!active||e.pointerId!==active.id)return;
 const a=active;active=null; // lostpointercapture may be dispatched by release.
 if(a.slider.hasPointerCapture?.(a.id))a.slider.releasePointerCapture(a.id);
 if(a.slider.disabled){lastTap=null;return;}
 const ended=e.type==='pointerup';
 // Native range may jump on contact before the browser recognizes a vertical
 // scroll. Roll back only an abandoned/non-horizontal sequence, through the
 // same input/change bindings as a normal native edit.
 if((!ended&&a.direction!=='horizontal'||a.direction==='vertical')&&a.slider.value!==a.value){a.slider.value=a.value;a.slider.dispatchEvent(new Event('input',{bubbles:true}));a.slider.dispatchEvent(new Event('change',{bubbles:true}));}
 const tap=ended&&!a.moved&&Math.hypot(e.clientX-a.x,e.clientY-a.y)<=8&&performance.now()-a.time<350;
 if(tap){const now=performance.now(),previous=lastTap;lastTap={slider:a.slider,time:now,x:e.clientX,y:e.clientY};
  if(previous?.slider===a.slider&&now-previous.time<350&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<24){lastTap=null;resets.get(a.slider)?.();}
 }else lastTap=null;
}
document.addEventListener('pointerdown',e=>{
 // A later sequence, including a card/button tap, cannot retain an old owner.
 if(active)finish({pointerId:active.id,type:'pointercancel'});
 const slider=e.target.closest?.('input[type="range"]');
 if(!slider||slider.disabled||!['touch','pen'].includes(e.pointerType)||e.isPrimary===false){lastTap=null;return;}
 active={id:e.pointerId,slider,x:e.clientX,y:e.clientY,time:performance.now(),value:slider.value,moved:false,direction:null};
},true);
document.addEventListener('pointermove',e=>{if(active&&active.id===e.pointerId){const dx=e.clientX-active.x,dy=e.clientY-active.y;if(Math.hypot(dx,dy)>8){active.moved=true;if(!active.direction)active.direction=Math.abs(dx)>Math.abs(dy)?'horizontal':'vertical';}}},true);
for(const name of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,finish,true);
function abandon(){if(active)finish({pointerId:active.id,type:'pointercancel'});lastTap=null;}
root.addEventListener('blur',abandon);document.addEventListener('visibilitychange',()=>{if(document.hidden)abandon();});
root.NSRangeInteraction=Object.freeze({resetOnDoubleTap:(slider,reset)=>resets.set(slider,reset),snapshot:()=>({active:active?.slider.id||null,pointerId:active?.id??null})});
})(globalThis);
