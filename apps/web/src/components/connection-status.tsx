"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { SW_URL } from "@/lib/service-worker";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Registers the offline service worker and, when the connection drops, shows a
 * slim notice so nothing fails silently. Saved changes wait and go through as
 * soon as the connection returns (while this tab stays open).
 */
export function ConnectionStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(SW_URL).catch(() => {
      // Offline support is a nicety; the app works without it.
    });
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-center text-xs font-medium text-background"
    >
      <WifiOff className="size-3.5 shrink-0" />
      You&apos;re offline. Keep Dovie open and anything you add will save when you&apos;re back online.
    </div>
  );
}
