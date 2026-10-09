"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/use-optimistic";
import * as api from "./api";
import type { Habit } from "./api";

export function useHabits(today: string, onError: (message: string) => void) {
  const qc = useQueryClient();
  const queryKey = ["habits", today];

  const query = useQuery({ queryKey, queryFn: () => api.fetchHabits(today) });

  const add = useMutation({
    mutationFn: (title: string) => api.addHabit(title),
    onError: (e) => onError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const toggle = useOptimisticMutation<Habit[], { id: string; done: boolean }>({
    queryKey,
    onError,
    mutate: (v) => api.setHabitDone(v.id, today, v.done),
    // The server recalculates the streak; this estimate keeps the UI instant.
    apply: (habits, v) =>
      habits.map((h) => {
        if (h.id !== v.id || h.done_today === v.done) return h;
        const streak = v.done ? h.streak + 1 : Math.max(h.streak - 1, 0);
        return {
          ...h,
          done_today: v.done,
          streak,
          best: v.done ? Math.max(h.best, streak) : h.best,
          recent_dates: v.done
            ? [...h.recent_dates, today]
            : h.recent_dates.filter((d) => d !== today),
        };
      }),
  });

  const rename = useOptimisticMutation<Habit[], { id: string; title: string }>({
    queryKey,
    onError,
    mutate: (v) => api.renameHabit(v.id, v.title),
    apply: (habits, v) => habits.map((h) => (h.id === v.id ? { ...h, title: v.title.trim() } : h)),
  });

  const remove = useOptimisticMutation<Habit[], string>({
    queryKey,
    onError,
    mutate: (id) => api.deleteHabit(id),
    apply: (habits, id) => habits.filter((h) => h.id !== id),
  });

  return { query, add, toggle, rename, remove };
}
