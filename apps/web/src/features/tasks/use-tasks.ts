"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { Task } from "./types";

type Options<V> = {
  today: string;
  mutate: (v: V) => Promise<void>;
  apply: (tasks: Task[], v: V) => Task[];
  onError: (message: string) => void;
};

/** A mutation that updates the cached list immediately and rolls back on failure. */
function useOptimisticTaskMutation<V>({ today, mutate, apply, onError }: Options<V>) {
  const qc = useQueryClient();
  const key = ["tasks", today];

  return useMutation({
    mutationFn: mutate,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (tasks) => apply(tasks ?? [], v));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      onError(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Tasks for one day. Everything is optimistic except adding a task. */
export function useTasks(today: string, onError: (message: string) => void) {
  const qc = useQueryClient();
  const key = ["tasks", today];

  const query = useQuery({ queryKey: key, queryFn: () => api.fetchTodayTasks(today) });

  const add = useMutation({
    mutationFn: (v: { title: string; isPriority: boolean }) =>
      api.addTask(v.title, today, v.isPriority),
    onError: (e) => onError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggle = useOptimisticTaskMutation({
    today,
    onError,
    mutate: (v: { id: string; done: boolean }) => api.setCompleted(v.id, v.done),
    apply: (tasks, v) =>
      tasks.map((t) =>
        t.id === v.id ? { ...t, completed_at: v.done ? new Date().toISOString() : null } : t,
      ),
  });

  const prioritise = useOptimisticTaskMutation({
    today,
    onError,
    mutate: (v: { id: string; value: boolean }) => api.setPriority(v.id, v.value),
    apply: (tasks, v) => tasks.map((t) => (t.id === v.id ? { ...t, is_priority: v.value } : t)),
  });

  const rename = useOptimisticTaskMutation({
    today,
    onError,
    mutate: (v: { id: string; title: string }) => api.renameTask(v.id, v.title),
    apply: (tasks, v) => tasks.map((t) => (t.id === v.id ? { ...t, title: v.title.trim() } : t)),
  });

  const remove = useOptimisticTaskMutation({
    today,
    onError,
    mutate: (id: string) => api.deleteTask(id),
    apply: (tasks, id) => tasks.filter((t) => t.id !== id),
  });

  return { query, add, toggle, prioritise, rename, remove };
}
