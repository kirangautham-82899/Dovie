"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

type Options<T, V> = {
  queryKey: QueryKey;
  mutate: (v: V) => Promise<void>;
  /** Produces the optimistic version of the cached data. */
  apply: (current: T, v: V) => T;
  onError: (message: string) => void;
};

/** A mutation that updates the cached query immediately and rolls back on failure. */
export function useOptimisticMutation<T, V>({ queryKey, mutate, apply, onError }: Options<T, V>) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: mutate,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<T>(queryKey);
      qc.setQueryData<T>(queryKey, (current) => (current === undefined ? current : apply(current, v)));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(queryKey, ctx.previous);
      onError(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}
