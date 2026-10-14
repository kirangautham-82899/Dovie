"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/lib/use-optimistic";
import type { CheckinFields } from "@/features/checkin/api";
import * as api from "./api";
import type { WellnessDay } from "./api";

export function useWellness(today: string, onError: (message: string) => void) {
  const qc = useQueryClient();
  const queryKey = ["wellness", today];
  const query = useQuery({ queryKey, queryFn: () => api.fetchWellness(today) });

  const save = useOptimisticMutation<WellnessDay, CheckinFields>({
    queryKey,
    onError,
    mutate: (v) => api.saveWellness(today, v),
    apply: (day, v) => ({ ...day, ...v }) as WellnessDay,
  });

  const focus = useMutation({
    mutationFn: (minutes: number) => api.addFocusSession(today, minutes),
    onError: (e) => onError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const move = useOptimisticMutation<WellnessDay, { activity: string; minutes: number }>({
    queryKey,
    onError,
    mutate: (v) => api.logMovement(today, v.activity, v.minutes),
    apply: (day, v) => ({ ...day, movement_minutes: day.movement_minutes + v.minutes }),
  });

  return { query, save, focus, move };
}
