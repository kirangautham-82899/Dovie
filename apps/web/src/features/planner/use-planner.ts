"use client";

import { useQuery } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/use-optimistic";
import { addTask, deleteTask, renameTask, setCompleted, setPriority } from "@/features/tasks/api";
import type { Task } from "@/features/tasks/types";
import { addBlock, deleteBlock, type TimeBlock } from "@/features/calendar/api";
import { fetchPlannerBlocks, fetchPlannerDay, moveTasks, plannerBlocksKey, plannerDayKey } from "./api";

export function usePlanner(day: string, today: string, onError: (message: string) => void) {
  const queryKey = plannerDayKey(day);
  const query = useQuery({ queryKey, queryFn: () => fetchPlannerDay(day, today) });
  const blocks = useQuery({ queryKey: plannerBlocksKey(day), queryFn: () => fetchPlannerBlocks(day) });

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
    apply: (tasks, v) => tasks.filter((t) => !v.ids.includes(t.id)),
  });

  const addEntry = useOptimisticMutation<TimeBlock[], { title: string; starts_at: string; ends_at: string }>({
    queryKey: plannerBlocksKey(day),
    onError,
    mutate: (v) => addBlock({ ...v, block_date: day }),
    apply: (list, v) =>
      [...list, { id: `temp-${Date.now()}`, title: v.title.trim(), block_date: day, starts_at: v.starts_at, ends_at: v.ends_at }].sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      ),
  });
  const removeEntry = useOptimisticMutation<TimeBlock[], string>({
    queryKey: plannerBlocksKey(day),
    onError,
    mutate: deleteBlock,
    apply: (list, id) => list.filter((b) => b.id !== id),
  });

  return { query, blocks, add, toggle, star, rename, remove, move, addEntry, removeEntry };
}
