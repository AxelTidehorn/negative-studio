/* Independent layout state — does not touch image processing. */
(() => {
 const root=document.getElementById('workspace');if(!root)return;
 const get=id=>document.getElementById(id);
 // Compact technical readouts remain available without permanently reducing picture height.
 const footer=root.querySelector('.image-footer');
 if(footer&&!footer.querySelector('.fl-diagnostics')){
  const diagnostics=document.createElement('details');diagnostics.className='fl-diagnostics';
  const summary=document.createElement('summary');summary.textContent='Bildinformation / tekniska detaljer';
  diagnostics.append(summary);
  for(const node of [...footer.children])if(!node.classList.contains('row'))diagnostics.append(node);
  footer.append(diagnostics);
 }
 const KEY='filmlabb-workspace-1';
 const defaults={queue:true,adjust:true,widthQueue:170,widthAdjust:320};
 let settings={...defaults};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved==='object')settings={...settings,...saved}}catch{}
 function clamp(n,min,max,fallback){return Number.isFinite(+n)?Math.max(min,Math.min(max,+n)):fallback}
 settings.widthQueue=clamp(settings.widthQueue,125,320,170);settings.widthAdjust=clamp(settings.widthAdjust,260,520,320);
 settings.queue=settings.queue!==false;settings.adjust=settings.adjust!==false;
 function fitPicture(){
  const picture=get('picture'),canvas=get('preview');
  if(!picture||!canvas||!canvas.width||!canvas.height)return;
  const w=picture.clientWidth,h=picture.clientHeight;
  if(w<1||h<1)return;
  const angle=((window.state?.rotation??0)%360+360)%360;
  // State is lexical in index.html; the actual rotation is reflected by applyView.
  const match=(canvas.style.transform||'').match(/rotate\((-?[\d.]+)deg\)/);
  const rotation=match?Number(match[1]):angle;
  const swapped=(Math.abs(rotation)%180)>45;
  const k=Math.min(w/(swapped?canvas.height:canvas.width),h/(swapped?canvas.width:canvas.height));
  canvas.style.setProperty('width',canvas.width*k+'px','important');
  canvas.style.setProperty('height',canvas.height*k+'px','important');
  // Center transform must come first, then pan/zoom/rotation.
  const t=canvas.style.transform.replace(/^translate\(-50%,\s*-50%\)\s*/, '');
  canvas.style.transform='translate(-50%, -50%) '+t;
  // Keep the overlay in the same native coordinate system as the preview.
  const overlay=get('cropOverlay');
  if(overlay&&!overlay.classList.contains('hidden')){
   overlay.style.width=canvas.width*k+'px';overlay.style.height=canvas.height*k+'px';
   overlay.style.left='50%';overlay.style.top='50%';
   overlay.style.transform='translate(-50%, -50%) '+t;
  }
 }
 function measureWorkspace(){
  if(matchMedia('(max-width:760px)').matches){root.style.removeProperty('--fl-workspace-height');return}
  const top=root.getBoundingClientRect().top;
  root.style.setProperty('--fl-workspace-height',Math.max(300,window.innerHeight-top-8)+'px');
  requestAnimationFrame(fitPicture);
 }
 function render(){
  root.classList.toggle('queue-collapsed',!settings.queue);root.classList.toggle('adjust-collapsed',!settings.adjust);
  root.style.setProperty('--queue-width',settings.widthQueue+'px');root.style.setProperty('--adjust-width',settings.widthAdjust+'px');
  get('toggleQueue').setAttribute('aria-pressed',String(settings.queue));
  get('toggleAdjustments').setAttribute('aria-pressed',String(settings.adjust));
  const focus=!settings.queue&&!settings.adjust;
  get('toggleFocus').setAttribute('aria-pressed',String(focus));
  get('toggleFocus').title=focus?'Avsluta fokusläge':'Visa bara fotografiet';
  try{localStorage.setItem(KEY,JSON.stringify(settings))}catch{}
  requestAnimationFrame(()=>{measureWorkspace();fitPicture()});
 }
 get('toggleQueue').addEventListener('click',()=>{settings.queue=!settings.queue;render()});
 get('toggleAdjustments').addEventListener('click',()=>{settings.adjust=!settings.adjust;render()});
 get('toggleFocus').addEventListener('click',()=>{if(!settings.queue&&!settings.adjust){settings.queue=true;settings.adjust=true}else{settings.queue=false;settings.adjust=false}render()});
 get('resetWorkspace').addEventListener('click',()=>{settings={...defaults};render()});
 for(const [selector,prop,dir,min,max] of [['.divider-left','widthQueue',1,125,320],['.divider-right','widthAdjust',-1,260,520]]){
  const grip=root.querySelector(selector);if(!grip)continue;
  grip.addEventListener('pointerdown',e=>{if(matchMedia('(max-width:1100px)').matches)return;
   const start=e.clientX,initial=settings[prop];grip.setPointerCapture(e.pointerId);
   const move=ev=>{settings[prop]=clamp(initial+(ev.clientX-start)*dir,min,max,initial);render()};
   const end=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end)};
   grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  });
  grip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();settings[prop]=clamp(settings[prop]+(e.key==='ArrowRight'?12:-12)*dir,min,max,settings[prop]);render()});
 }
 // Track changes in viewport, sidebars, orientation and canvas source size.
 const picture=get('picture'),canvas=get('preview');
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>requestAnimationFrame(fitPicture)).observe(picture);
 if(typeof MutationObserver!=='undefined')new MutationObserver(()=>requestAnimationFrame(fitPicture)).observe(canvas,{attributes:true,attributeFilter:['width','height','class']});
 window.addEventListener('resize',measureWorkspace);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',measureWorkspace);
 const priorApply=typeof window.applyView==='function'?window.applyView:null;
 // applyView is a top-level function declaration exposed on window by index.html.
 if(priorApply)window.applyView=function(...args){const result=priorApply.apply(this,args);requestAnimationFrame(fitPicture);return result};
 render();measureWorkspace();
})();
