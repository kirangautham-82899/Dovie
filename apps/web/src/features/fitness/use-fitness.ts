"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/use-optimistic";
import * as api from "./api";
import type { FitnessGoal, FitnessGoalInput } from "./api";

export function useFitness(today: string, onError: (message: string) => void) {
  const qc = useQueryClient();
  const queryKey = ["fitness", today];

  const query = useQuery({ queryKey, queryFn: () => api.fetchFitnessGoals(today) });

  const add = useMutation({
    mutationFn: (input: FitnessGoalInput) => api.addFitnessGoal(input),
    onError: (e) => onError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const update = useOptimisticMutation<FitnessGoal[], { id: string; input: FitnessGoalInput }>({
    queryKey,
    onError,
    mutate: (v) => api.updateFitnessGoal(v.id, v.input),
    apply: (goals, v) =>
      goals.map((g) =>
        g.id === v.id
          ? { ...g, title: v.input.title.trim(), target_value: v.input.target, unit: v.input.unit.trim() }
          : g,
      ),
  });

  const remove = useOptimisticMutation<FitnessGoal[], string>({
    queryKey,
    onError,
    mutate: (id) => api.deleteFitnessGoal(id),
    apply: (goals, id) => goals.filter((g) => g.id !== id),
  });

  const log = useOptimisticMutation<FitnessGoal[], { id: string; value: number }>({
    queryKey,
    onError,
    mutate: (v) => api.logProgress(v.id, v.value, today),
    apply: (goals, v) => goals.map((g) => (g.id === v.id ? { ...g, today_total: g.today_total + v.value } : g)),
  });

  const reset = useOptimisticMutation<FitnessGoal[], string>({
    queryKey,
    onError,
    mutate: (id) => api.resetToday(id, today),
    apply: (goals, id) => goals.map((g) => (g.id === id ? { ...g, today_total: 0 } : g)),
  });

  return { query, add, update, remove, log, reset };
}
