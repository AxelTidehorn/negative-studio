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
 // The editor owns image geometry; sidebars only request a redraw.
 function fitPicture(){if(typeof drawCrop==='function')drawCrop();}
 function measureWorkspace(){
  const header=document.querySelector('header');
  const toolbar=document.querySelector('.workspace-toolbar');
  const footer=document.querySelector('.foot');
  const headerH=header?Math.round(header.getBoundingClientRect().height):0;
  const toolbarH=toolbar?Math.round(toolbar.getBoundingClientRect().height):0;
  if(document.documentElement?.style){
   document.documentElement.style.setProperty('--fl-header-height',headerH+'px');
   document.documentElement.style.setProperty('--fl-toolbar-height',toolbarH+'px');
   document.documentElement.style.setProperty('--fl-top-stack-height',(headerH+toolbarH)+'px');
  }
  if(matchMedia('(max-width:760px)').matches){
   root.style.removeProperty('--fl-workspace-height');
   root.style.setProperty('--fl-workspace-height-mobile',Math.max(300,window.innerHeight-(toolbarH||0)-6)+'px');
   if(footer)footer.style.removeProperty('margin-top');
   requestAnimationFrame(fitPicture);
   return;
  }
  const toolbarBottom=toolbar?toolbar.getBoundingClientRect().bottom:root.getBoundingClientRect().top;
  const target=Math.max(320,Math.round(window.innerHeight-toolbarH-6));
  root.style.setProperty('--fl-workspace-height',target+'px');
  if(footer)footer.style.marginTop='10px';
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
 function updateDockState(){document.body.classList.toggle('workspace-docked',window.scrollY>18);}
 // Two discrete mouse-wheel stages: landing -> workstation, workstation -> landing.
 // Do not hijack scrolling in controls, queue, editor or nested popovers.
 let inTransition=false;
 const dockOffset=()=>Math.round(document.querySelector('header')?.getBoundingClientRect().height||58);
 let fixedDock=0;
 function stageScroll(e){
  if(e.ctrlKey||e.metaKey||e.shiftKey||Math.abs(e.deltaY)<3)return;
  const element=e.target;
  if(element instanceof Element&&element.closest('.editor-panel,.queue-panel,.fl-info-content,details[open],select,input,textarea,[contenteditable="true"]'))return;
  const header=document.querySelector('header');
  fixedDock=header?.offsetHeight||fixedDock||58;
  const y=window.scrollY;
  if(e.deltaY>0 && y<fixedDock-2){
   e.preventDefault();if(!inTransition){inTransition=true;window.scrollTo({top:fixedDock,behavior:'smooth'});setTimeout(()=>inTransition=false,430);}
  }else if(e.deltaY<0 && y>1 && y<=fixedDock+16){
   e.preventDefault();if(!inTransition){inTransition=true;window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>inTransition=false,430);}
  }else if(inTransition){e.preventDefault();}
 }
 window.addEventListener('wheel',stageScroll,{passive:false});
 window.addEventListener('scroll',updateDockState,{passive:true});
 window.addEventListener('resize',measureWorkspace);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',measureWorkspace);
 window.addEventListener('filmlabb:view-change',()=>requestAnimationFrame(fitPicture));
 render();measureWorkspace();updateDockState();
})();
