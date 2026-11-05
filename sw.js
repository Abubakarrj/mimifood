// Shop service worker (scope /): makes the site installable as an app and keeps the pages you've
// visited available offline. Everything comes from the network first, so a deploy shows up
// straight away; a cached copy is only used without a connection. API calls (cart checkout,
// account, orders) are never cached, and the back office has its own worker (admin-sw.js).

const CACHE = "shop-v453-mimi38";
const SHELL = ["/", "/shop", "/offline", "/styles.css", "/js/app.js", "/js/data.js", "/site.webmanifest", "/assets/logo.svg", "/assets/icon-192.png"];
const STATIC = /\.(html|css|js|svg|png|jpe?g|webp|webmanifest)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("shop-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;
  const page = req.mode === "navigate";
  if (!page && !STATIC.test(url.pathname) && !url.pathname.startsWith("/media/")) return;
  // Cached by path, ignoring ?v= version tags and ?id= product links (the page reads those itself).
  const key = url.pathname;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((hit) => hit || (page ? caches.match("/offline") : Response.error())))
  );
});
