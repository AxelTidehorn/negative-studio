/* Independent layout state — does not touch image processing. */
(() => {
 const root=document.getElementById('workspace');if(!root)return;
 const get=id=>document.getElementById(id);
 const KEY='filmlabb-workspace-1';
 const defaults={queue:true,adjust:true,widthQueue:170,widthAdjust:320};
 let settings={...defaults};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved==='object')settings={...settings,...saved}}catch{}
 function clamp(n,min,max,fallback){return Number.isFinite(+n)?Math.max(min,Math.min(max,+n)):fallback}
 settings.widthQueue=clamp(settings.widthQueue,125,320,170);settings.widthAdjust=clamp(settings.widthAdjust,260,520,320);
 settings.queue=settings.queue!==false;settings.adjust=settings.adjust!==false;
 const motionQuery=matchMedia('(prefers-reduced-motion:reduce)'),running=new Map(),scrolls=new Map();
 const sides=[['queue','queuePanel','toggleQueue','.divider-left',-1],['adjust','adjustmentPanel','toggleAdjustments','.divider-right',1]];
 let shown={queue:settings.queue,adjust:settings.adjust},layoutFrame=0;
 function requestLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;measureWorkspace();fitPicture()});}
 function finishMotion(){
  for(const animation of running.values())animation.cancel();running.clear();
  root.classList.remove('queue-exiting','adjust-exiting');requestLayout();
 }
 function timing(){const s=getComputedStyle(root),v=s.getPropertyValue('--ui-motion-panel').trim();return {duration:parseFloat(v)*(v.endsWith('ms')?1:1000)||0,easing:s.getPropertyValue('--ui-motion-ease').trim()||'ease'};}
 // The editor owns image geometry; sidebars only request a redraw.
 function fitPicture(){if(typeof drawCrop==='function')drawCrop();}
 function measureWorkspace(){
  const header=document.querySelector('header'),toolbar=document.querySelector('.workspace-toolbar');
  // Only the visible header consumes space. The footer stays in document flow.
  const hh=Math.max(0,Math.ceil(header?.getBoundingClientRect().bottom||0)),th=Math.ceil(toolbar?.getBoundingClientRect().height||0);
  const viewportHeight=Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight);
  document.documentElement.style.setProperty('--fl-toolbar-height',th+'px');
  document.documentElement.style.setProperty('--fl-header-height',hh+'px');
  if(matchMedia('(max-width:760px)').matches)root.style.removeProperty('--fl-workspace-height');
  else root.style.setProperty('--fl-workspace-height',Math.max(240,Math.floor(viewportHeight)-hh-th)+'px');
  requestAnimationFrame(fitPicture);
 }
 function render(animate=false){
  const time=timing(),moving=animate&&!motionQuery.matches&&time.duration>0;
  const changes=[],restoring=new Set();let layoutChanged=!animate||!moving;
  for(const [key,id,toggle,grip,direction] of sides){
   const panel=get(id),opening=settings[key];
   if(!animate){running.get(key)?.cancel();running.delete(key);root.classList.remove(key+'-exiting');}
   if(shown[key]!==opening){
    const visible=getComputedStyle(panel).display!=='none',style=getComputedStyle(panel);
    const scroller=key==='queue'?get('filmstrip'):panel;
    if(!opening&&visible)scrolls.set(key,{top:scroller.scrollTop,left:scroller.scrollLeft});
    if(opening&&scrolls.has(key))restoring.add(key);
    const from={opacity:style.opacity,translate:style.translate};
    running.get(key)?.cancel();running.delete(key);
    const enabled=moving&&typeof panel.animate==='function';
    if(!visible||!enabled)layoutChanged=true;
    root.classList.toggle(key+'-exiting',enabled&&visible&&!opening);
    if(enabled&&(visible||opening))changes.push({key,panel,opening,direction,visible,from});
   }
   if(!opening&&panel.contains(document.activeElement))get(toggle).focus({preventScroll:true});
   panel.inert=!opening;root.querySelector(grip).inert=!opening;
  }
  root.classList.toggle('queue-collapsed',!settings.queue);root.classList.toggle('adjust-collapsed',!settings.adjust);
  if(root.style.getPropertyValue('--queue-width')!==settings.widthQueue+'px'||root.style.getPropertyValue('--adjust-width')!==settings.widthAdjust+'px')layoutChanged=true;
  root.style.setProperty('--queue-width',settings.widthQueue+'px');root.style.setProperty('--adjust-width',settings.widthAdjust+'px');
  get('toggleQueue').setAttribute('aria-pressed',String(settings.queue));
  get('toggleAdjustments').setAttribute('aria-pressed',String(settings.adjust));
  const focus=!settings.queue&&!settings.adjust;
  get('toggleFocus').setAttribute('aria-pressed',String(focus));
  get('toggleFocus').title=focus?'Avsluta fokusläge':'Visa bara fotografiet';
  try{localStorage.setItem(KEY,JSON.stringify(settings))}catch{}
  shown={queue:settings.queue,adjust:settings.adjust};
  for(const [key,id] of sides)if(restoring.has(key)){
   const scroller=key==='queue'?get('filmstrip'):get(id),position=scrolls.get(key);
   scroller.scrollTop=position.top;scroller.scrollLeft=position.left;
  }
  for(const {key,panel,opening,direction,visible,from} of changes){
   if(getComputedStyle(panel).display==='none')continue;
   const edge=matchMedia('(max-width:760px)').matches?'0px -6px':(direction*4)+'px 0px';
   const animation=panel.animate([visible?from:{opacity:0,translate:edge},opening?{opacity:1,translate:'0px 0px'}:{opacity:0,translate:edge}],{...time,fill:'both'});
   running.set(key,animation);
   animation.finished.then(()=>{
    if(running.get(key)!==animation)return;
    running.delete(key);root.classList.remove(key+'-exiting');animation.cancel();if(!opening)requestLayout();
   },()=>{});
  }
  if(layoutChanged)requestLayout();
 }
 get('toggleQueue').addEventListener('click',()=>{settings.queue=!settings.queue;render(true)});
 get('toggleAdjustments').addEventListener('click',()=>{settings.adjust=!settings.adjust;render(true)});
 get('toggleFocus').addEventListener('click',()=>{if(!settings.queue&&!settings.adjust){settings.queue=true;settings.adjust=true}else{settings.queue=false;settings.adjust=false}render(true)});
 get('resetWorkspace').addEventListener('click',()=>{settings={...defaults};render(true)});
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
 let scrollFrame=0;
 window.addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;measureWorkspace()})},{passive:true});
 function resized(){finishMotion();measureWorkspace();}
 window.addEventListener('resize',resized);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',resized);
 motionQuery.addEventListener('change',()=>{if(motionQuery.matches)finishMotion();});
 window.addEventListener('filmlabb:view-change',()=>requestAnimationFrame(fitPicture));
 if(typeof ResizeObserver!=='undefined'){
  const observer=new ResizeObserver(measureWorkspace);for(const el of document.querySelectorAll('header,.workspace-toolbar'))observer.observe(el);
 }
 render();measureWorkspace();
})();
