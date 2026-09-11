const CACHE='steel-revision-v1';
const CORE=[
  '/steel-structures/revision.html',
  '/steel-structures/lecture.html',
  '/steel-structures/manifest.webmanifest',
  '/steel-structures/steel-app-icon.svg',
  '/assets/revision.css'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{
      const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match('/steel-structures/revision.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>{
    const network=fetch(req).then(res=>{
      if(res && res.status===200 && res.type!=='opaque') caches.open(CACHE).then(c=>c.put(req,res.clone()));
      return res;
    }).catch(()=>cached);
    return cached||network;
  }));
});
