"use client";

import { useState } from "react";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { APP_CACHE_KEY } from "@/lib/app-cache";

const DAY = 24 * 60 * 60 * 1000;

// Never written to browser storage: key material and anything identity-only.
const NOT_PERSISTED = new Set(["journal", "cycle", "mind", "auth-user"]);

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc: QueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Data stays fresh for a minute, so moving between screens shows
          // cached data instantly; mutations invalidate exactly what they change.
          staleTime: 60_000,
          // Kept for a day so the saved copy can be restored on the next visit.
          gcTime: DAY,
          retry: 1,
        },
      },
      mutationCache: new MutationCache({
        // Several views summarise data owned by other features (the check-in's
        // live score, wellness totals, the movement log, the weekly review), so
        // any change refreshes them. Only queries on screen actually refetch.
        onSettled: () => {
          for (const key of ["checkin", "wellness", "movement", "week", "calendar", "planner", "tasks"]) {
            void qc.invalidateQueries({ queryKey: [key] });
          }
        },
      }),
    });
    return qc;
  });

  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      key: APP_CACHE_KEY,
      throttleTime: 1000,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: DAY,
        // Bump when cached data shapes change, so old copies are discarded.
        buster: "2026-10-14",
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success" && !NOT_PERSISTED.has(String(q.queryKey[0])),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
