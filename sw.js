/* Service worker: stale-while-revalidate.
   Every load is served from cache instantly (works with zero signal), while a
   background fetch refreshes the cache — updates apply on the next launch.
   Responses are re-cached on every successful fetch, so the CACHE name only
   needs bumping if the caching strategy itself changes. */
const CACHE = "meso-tracker-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
                "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (cached) return cached;            // network result lands in cache for next time
    const res = await network;
    if (res) return res;
    if (e.request.mode === "navigate") return cache.match("./index.html");
    return Response.error();
  })());
});

/* Refresh on demand, asked for by the page.

   The page cannot do this itself. The fetch handler above answers from cache
   first and matches with ignoreSearch, so no cache-busting query string gets
   past it — which is exactly why "reload the page" did not pick up a new build.
   A fetch made HERE is not intercepted by this worker, so this is the only
   place a genuine network check can happen.

   cache.addAll replaces entries only if every request succeeds, so a refresh
   attempted with no signal throws and leaves the cached app exactly as it was.
   That matters: this runs on a phone in a gym basement. */
self.addEventListener("message", e => {
  if (e.data !== "refresh") return;
  e.waitUntil((async () => {
    let ok = false, lastModified = null;
    try {
      const res = await fetch("./index.html", { cache: "reload" });
      if (res && res.ok) {
        lastModified = res.headers.get("last-modified");
        await (await caches.open(CACHE)).addAll(ASSETS);
        ok = true;
      }
    } catch (err) { ok = false; }
    (await self.clients.matchAll()).forEach(c =>
      c.postMessage({ type: "refreshed", ok, lastModified }));
  })());
});
