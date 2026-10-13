// Cambia VERSION cada vez que publiques cambios en estos archivos.
const VERSION = "v2";
const CORE = "rutina-core-" + VERSION;
const FONTS = "rutina-fonts";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CORE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("rutina-core-") && k !== CORE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: usa la copia guardada, y si no hay, la red.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    ev.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }))));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Página: primero la red (para recibir cambios). Sin señal, o si tarda más de 3 s, la copia guardada.
  if (req.mode === "navigate") {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CORE).then(c => c.put("./index.html", copy)); }
      return res;
    });
    const slow = new Promise(r => setTimeout(r, 3000)).then(() => caches.match("./index.html"));
    ev.respondWith(Promise.race([net, slow.then(hit => hit || net)]).catch(() => caches.match("./index.html")));
    return;
  }

  ev.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
