// Service worker mínimo: cachea el shell para que la app abra sin conexión.
// Los datos SIEMPRE vienen de la red (API).

const CACHE = 'tickets-shell-v1';
const SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16.png',
  '/favicon-32.png',
  '/favicon-192.png',
  '/favicon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);

  // La API nunca se cachea: siempre red.
  if(url.pathname.startsWith('/auth') || url.pathname.startsWith('/records') || url.pathname.startsWith('/docs')){
    return;
  }

  // Método distinto de GET: red directo.
  if(e.request.method !== 'GET') return;

  // Recursos propios: cache-first con fallback a red.
  if(url.origin === location.origin){
    e.respondWith(
      caches.match(e.request).then(hit => {
        return hit || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
          return res;
        }).catch(()=> caches.match('/index.html'));
      })
    );
  }
  // Recursos externos (CDN): red.
});