/**
 * The service worker's address. Production builds add ?cache=1, which turns on
 * offline caching inside the worker; development leaves it off so it never
 * serves stale files. Everything that registers the worker must use this one
 * address, or the browser treats it as a different script and swaps them.
 */
export const SW_URL = process.env.NODE_ENV === "production" ? "/sw.js?cache=1" : "/sw.js";

/** Tells the worker to forget saved pages (used on sign-out, for shared devices). */
export function clearSavedPages() {
  try {
    navigator.serviceWorker?.controller?.postMessage("dovie-clear-pages");
  } catch {
    // No worker, nothing saved.
  }
}
