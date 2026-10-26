"use client";

import { useQuery } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/use-optimistic";
import { fetchCycle, saveCycleDay } from "./cycle-api";
import type { CycleLog } from "./cycle";
import { addMeal, deleteMeal, fetchMeals, type Meal, type MealId } from "./diet-api";
import { fetchMind, isEmptyMind, saveMind, type MindLog } from "./mind-api";

export function useCycle(today: string, onError: (message: string) => void) {
  const queryKey = ["cycle", today];
  const query = useQuery({ queryKey, queryFn: () => fetchCycle(today) });

  const setDay = useOptimisticMutation<CycleLog[], CycleLog>({
    queryKey,
    onError,
    mutate: saveCycleDay,
    apply: (logs, v) => {
      const rest = logs.filter((l) => l.log_date !== v.log_date);
      if (v.flow === null && v.symptoms.length === 0) return rest;
      return [...rest, v].sort((a, b) => a.log_date.localeCompare(b.log_date));
    },
  });

  return { query, setDay };
}

export function useMind(today: string, onError: (message: string) => void) {
  const queryKey = ["mind", today];
  const query = useQuery({ queryKey, queryFn: () => fetchMind(today) });

  const save = useOptimisticMutation<MindLog[], MindLog>({
    queryKey,
    onError,
    mutate: saveMind,
    apply: (logs, v) => {
      const rest = logs.filter((l) => l.log_date !== v.log_date);
      if (isEmptyMind(v)) return rest;
      return [...rest, v].sort((a, b) => a.log_date.localeCompare(b.log_date));
    },
  });

  return { query, save };
}

export function useDiet(day: string, onError: (message: string) => void) {
  const queryKey = ["diet", day];
  const query = useQuery({ queryKey, queryFn: () => fetchMeals(day) });

  const add = useOptimisticMutation<Meal[], { meal: MealId; title: string; calories: number | null }>({
    queryKey,
    onError,
    mutate: (v) => addMeal({ day, ...v }),
    apply: (meals, v) => [...meals, { id: `temp-${Date.now()}`, meal_date: day, meal: v.meal, title: v.title.trim(), calories: v.calories }],
  });
  const remove = useOptimisticMutation<Meal[], string>({
    queryKey,
    onError,
    mutate: deleteMeal,
    apply: (meals, id) => meals.filter((m) => m.id !== id),
  });

  return { query, add, remove };
}
