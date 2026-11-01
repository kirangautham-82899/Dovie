// Dovie's service worker. It does two jobs:
//  1. Notification taps bring the live workout back to the front.
//  2. Offline support: static files are kept after the first visit, and a
//     page you've opened before can open again with no connection. If a page
//     was never opened, a friendly "you're offline" page shows instead.
//
// What it never touches: API calls, sign-in routes, other sites (Supabase),
// and anything that isn't a plain GET. Your data always comes from the network
// or from the app's own saved copy; this file caches no account data.
//
// Caching only switches on when registered as /sw.js?cache=1 (production
// builds do this), so development never serves stale files.

const CACHE_ON = new URL(self.location.href).searchParams.get("cache") === "1";
const VERSION = "v1";
const STATIC = `dovie-static-${VERSION}`;
const PAGES = `dovie-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_STATIC_ENTRIES = 250;
const MAX_PAGE_ENTRIES = 40;

self.addEventListener("install", (event) => {
  if (CACHE_ON) {
    // A failure here must not block the worker from installing.
    event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE_URL)).catch(() => {}));
  }
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES]);
      for (const name of await caches.keys()) {
        if (name.startsWith("dovie-") && !keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

/** Drop the oldest entries so the cache can't grow without limit. */
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/icon.svg" ||
  url.pathname === "/apple-icon";

// Handled by the network only.
const isNeverCached = (url) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/");

self.addEventListener("fetch", (event) => {
  if (!CACHE_ON) return;
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isNeverCached(url)) return;

  if (isStaticAsset(url)) {
    // Hashed, never-changing files: the saved copy wins, the network fills gaps.
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) {
          cache.put(request, res.clone());
          trim(cache, MAX_STATIC_ENTRIES);
        }
        return res;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Pages: the network first (so you always get the newest), the saved copy offline.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          // Redirects (for example signed-out people sent to sign-in) are never kept.
          if (res.ok && !res.redirected && res.type === "basic") {
            const cache = await caches.open(PAGES);
            cache.put(request, res.clone());
            trim(cache, MAX_PAGE_ENTRIES);
          }
          return res;
        } catch {
          const cache = await caches.open(PAGES);
          return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});

self.addEventListener("message", (event) => {
  // Sent on sign-out so a shared device keeps nothing from the last person.
  if (event.data === "dovie-clear-pages") {
    event.waitUntil(
      caches.open(PAGES).then(async (cache) => {
        for (const req of await cache.keys()) {
          if (new URL(req.url).pathname !== OFFLINE_URL) await cache.delete(req);
        }
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/fitness";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
