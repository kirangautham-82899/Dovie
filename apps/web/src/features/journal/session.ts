"use client";

import { useSyncExternalStore } from "react";

// The unlocked data key lives only in memory, as the crypto spec requires.
// It survives moving between pages and is gone on reload or "Lock".

type Session = { userId: string; dek: Uint8Array } | null;

let session: Session = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function unlockSession(userId: string, dek: Uint8Array) {
  session = { userId, dek };
  emit();
}

export function lockSession() {
  session?.dek.fill(0);
  session = null;
  emit();
}

export function useJournalSession(userId: string | undefined): Uint8Array | null {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
    () => null,
  );
  return s && s.userId === userId ? s.dek : null;
}
