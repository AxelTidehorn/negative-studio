/* The production build replaces CACHE with a hash of the complete asset set.
   Do not skip waiting: an existing tab must finish with its installed version. */
const CACHE='filmlabb-stability-source-v1';
const ASSETS=[]; // Injected from the complete built asset tree.
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // A failed asset rejects installation; the previous worker stays active.
 await Promise.all(ASSETS.map(u=>cache.add(new Request(new URL(u,self.registration.scope),{cache:'reload'}))));
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('filmlabb-')&&key!==CACHE)await caches.delete(key);
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const request=e.request.mode==='navigate'?new URL('./index.html',self.registration.scope).href:e.request;
  const cached=await cache.match(request,{ignoreSearch:true});
  // All installed application files come from one complete version, including HTML.
  return cached||fetch(e.request);
 })());
});
