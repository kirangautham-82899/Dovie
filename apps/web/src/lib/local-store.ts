"use client";

/**
 * A tiny external store for useSyncExternalStore. With a key, the value is
 * mirrored to localStorage so it survives the app being closed.
 */
export function createStore<T>(initial: () => T, key?: string) {
  let value: T | undefined;
  const listeners = new Set<() => void>();
  const get = () => {
    if (value === undefined) {
      value = initial();
      if (key && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const saved = JSON.parse(raw) as T;
            // Objects are merged over the defaults, so new fields get a value.
            value = value && saved && typeof value === "object" ? { ...value, ...saved } : saved;
          }
        } catch {
          // Fall back to the default.
        }
      }
    }
    return value as T;
  };
  return {
    get,
    set(next: T) {
      value = next;
      if (key) {
        try {
          if (next === null) localStorage.removeItem(key);
          else localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage blocked; the value still applies for this visit.
        }
      }
      for (const l of listeners) l();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
