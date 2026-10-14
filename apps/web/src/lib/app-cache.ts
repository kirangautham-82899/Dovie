"use client";

// The app's data cache is saved in this browser so screens open instantly
// with last-known data and refresh in the background. It is wiped whenever
// the account on this device changes (sign-out, sign-in, data cleared,
// account deleted), so one person never sees another's data.

export const APP_CACHE_KEY = "dovie-cache-v1";

export function clearAppCache() {
  try {
    localStorage.removeItem(APP_CACHE_KEY);
  } catch {
    // Storage can be unavailable (private mode); nothing was saved then.
  }
}
