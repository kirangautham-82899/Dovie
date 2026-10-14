"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export function useCheckin(today: string, onError: (message: string) => void) {
  const qc = useQueryClient();
  const queryKey = ["checkin", today];

  const query = useQuery({ queryKey, queryFn: () => api.fetchCheckinState(today) });

  const save = useMutation({
    mutationFn: (v: { mood: number; note: string }) => api.saveCheckin(today, v.mood, v.note),
    onError: (e) => onError(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["week"] });
    },
  });

  return { query, save };
}
