const VERSION = '2a2cfdca71';
const FILES = ["./","./4iub5gi.js","./qpy3wmh.js","./zvga6p5.js","./f6c5xz4.js","./d8hbkej.js","./amcnm9m.js","./3phb5vf.woff2","./qwp26wa.woff2","./fd8rpnp.woff2","./5mgcha7.woff2","./5bvgpyd.woff2","./yg7tevr.woff2","./abnpbnd.png","./xppxxid.png","./25rkr96.png","./kjx6cc8.png","./8qn93pi.js","./sdn9sd8.webmanifest","./94h25de.js","./ewdv3t5.js","./u4rp9mt.js","./ydsa43m.js","./uhyk5uj.js","./rdjz6js.js","./f36qmgd.js","./g8mradk.css","./rne5xj8.js","./w7vpbjf.js","./nyxk7bs.js","./5axywum.js","./i832ug2.js","./7uhqccq.js","./4jze4k2.js","./nx8kc5c.js"];
const CACHE = `etut-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('etut-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (req.mode === 'navigate' && !res.ok) return caches.match('./');
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()));
    }),
  );
});
