/* Keep native range values, keyboard and mouse behavior. Touch reset recognizes
   actual stationary taps, never two arbitrary drag endings. In particular no
   terminal touch event is cancelled: WebKit must finish its native control. */
(function(root){
'use strict';
if(typeof document.addEventListener!=='function')return;
const resets=new WeakMap();let active=null,lastTap=null;
function flush(a){
 if(a.pendingInput){a.pendingInput=false;a.slider.dispatchEvent(new Event('input',{bubbles:true}));}
 if(a.pendingChange){a.pendingChange=false;a.slider.dispatchEvent(new Event('change',{bubbles:true}));}
}
// Native ranges can jump on contact before the browser chooses to scroll.
// Defer their model notifications until a horizontal drag or completed tap,
// using the native values. A cancelled scroll then leaves exact saved values
// and other input owners (including frame geometry) completely untouched.
for(const type of ['input','change'])document.addEventListener(type,e=>{
 if(active&&e.target===active.slider&&!active.committed){e.stopImmediatePropagation();active[type==='input'?'pendingInput':'pendingChange']=true;}
},true);
function finish(e){
 if(!active||e.pointerId!==active.id)return;
 const a=active;active=null; // lostpointercapture may be dispatched by release.
 if(a.slider.hasPointerCapture?.(a.id))a.slider.releasePointerCapture(a.id);
 if(a.slider.disabled){lastTap=null;return;}
 const ended=e.type==='pointerup';
 if(a.committed||ended&&a.direction!=='vertical')flush(a);
 else a.slider.value=a.value;
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
 active={id:e.pointerId,slider,x:e.clientX,y:e.clientY,time:performance.now(),value:slider.value,moved:false,direction:null,committed:false,pendingInput:false,pendingChange:false};
},true);
document.addEventListener('pointermove',e=>{if(active&&active.id===e.pointerId){const dx=e.clientX-active.x,dy=e.clientY-active.y;if(Math.hypot(dx,dy)>8){active.moved=true;if(!active.direction){active.direction=Math.abs(dx)>Math.abs(dy)?'horizontal':'vertical';if(active.direction==='horizontal'){active.committed=true;flush(active);}}}}},true);
for(const name of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,finish,true);
function abandon(){if(active)finish({pointerId:active.id,type:'pointercancel'});lastTap=null;}
root.addEventListener('blur',abandon);document.addEventListener('visibilitychange',()=>{if(document.hidden)abandon();});
root.NSRangeInteraction=Object.freeze({resetOnDoubleTap:(slider,reset)=>resets.set(slider,reset),snapshot:()=>({active:active?.slider.id||null,pointerId:active?.id??null})});
})(globalThis);
