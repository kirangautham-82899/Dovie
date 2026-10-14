"use client";

import { useOptimisticMutation } from "@/lib/use-optimistic";
import { useQuery } from "@tanstack/react-query";
import * as api from "./api";
import type { Profile, ProfileUpdate } from "./api";

export const PROFILE_KEY = ["profile"];

export function useProfile(onError: (message: string) => void = () => {}) {
  // The profile rarely changes and every screen needs it, so it is fetched
  // once per visit and kept; edits in Settings update this cache directly.
  const query = useQuery({ queryKey: PROFILE_KEY, queryFn: api.fetchProfile, staleTime: 10 * 60_000 });

  const update = useOptimisticMutation<Profile, ProfileUpdate>({
    queryKey: PROFILE_KEY,
    onError,
    mutate: (values) => {
      const id = query.data?.id;
      if (!id) return Promise.reject(new Error("Profile not loaded yet."));
      return api.updateProfile(id, values);
    },
    apply: (profile, values) => ({ ...profile, ...values }),
  });

  return { query, update };
}

/** Applies a theme to the page and remembers it for the next first paint. */
export function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("dovie-theme", theme);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
}

