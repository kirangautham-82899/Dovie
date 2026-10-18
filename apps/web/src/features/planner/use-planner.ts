"use client";

import { useQuery } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/use-optimistic";
import { addTask, deleteTask, renameTask, setCompleted, setPriority } from "@/features/tasks/api";
import type { Task } from "@/features/tasks/types";
import { fetchPlannerMonth, moveTasks } from "./api";

export function usePlanner(month: string, today: string, onError: (message: string) => void) {
  const queryKey = ["planner", month];
  const query = useQuery({ queryKey, queryFn: () => fetchPlannerMonth(month, today) });

  const add = useOptimisticMutation<Task[], { title: string; date: string; priority: boolean }>({
    queryKey,
    onError,
    mutate: (v) => addTask(v.title, v.date, v.priority),
    apply: (tasks, v) => [
      ...tasks,
      {
        id: `temp-${Date.now()}`,
        title: v.title.trim(),
        due_date: v.date,
        is_priority: v.priority,
        completed_at: null,
        carry_count: 0,
        created_at: new Date().toISOString(),
      },
    ],
  });
  const toggle = useOptimisticMutation<Task[], { id: string; done: boolean }>({
    queryKey,
    onError,
    mutate: (v) => setCompleted(v.id, v.done),
    apply: (tasks, v) => tasks.map((t) => (t.id === v.id ? { ...t, completed_at: v.done ? new Date().toISOString() : null } : t)),
  });
  const star = useOptimisticMutation<Task[], { id: string; value: boolean }>({
    queryKey,
    onError,
    mutate: (v) => setPriority(v.id, v.value),
    apply: (tasks, v) => tasks.map((t) => (t.id === v.id ? { ...t, is_priority: v.value } : t)),
  });
  const rename = useOptimisticMutation<Task[], { id: string; title: string }>({
    queryKey,
    onError,
    mutate: (v) => renameTask(v.id, v.title),
    apply: (tasks, v) => tasks.map((t) => (t.id === v.id ? { ...t, title: v.title.trim() } : t)),
  });
  const remove = useOptimisticMutation<Task[], string>({
    queryKey,
    onError,
    mutate: deleteTask,
    apply: (tasks, id) => tasks.filter((t) => t.id !== id),
  });
  const move = useOptimisticMutation<Task[], { ids: string[]; date: string }>({
    queryKey,
    onError,
    mutate: (v) => moveTasks(v.ids, v.date),
    apply: (tasks, v) => tasks.map((t) => (v.ids.includes(t.id) ? { ...t, due_date: v.date, is_priority: false } : t)),
  });

  return { query, add, toggle, star, rename, remove, move };
}
