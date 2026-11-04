// Back office service worker (scope /admin): makes the back office installable and keeps its
// shell available offline. Pages and code come from the network first, so a deploy shows up
// straight away; the cached copy is only used without a connection. API calls (orders,
// customers…) are never cached: they always need the server.

const CACHE = "bo-shell-v262-mimi13";
const SHELL = ["/admin", "/admin.css", "/admin-medusa.css", "/js/admin.js", "/vendor/lucide.min.js", "/admin.webmanifest", "/assets/admin-icon-192.png", "/assets/logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || (url.pathname.startsWith("/admin/") && req.mode !== "navigate")) return;
  // Network first; fall back to the cached shell (ignoring ?v= version tags).
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && SHELL.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copy));
        }
        return res;
      })
      .catch(() => caches.match(url.pathname).then((hit) => hit || (req.mode === "navigate" ? caches.match("/admin") : Response.error())))
  );
});
