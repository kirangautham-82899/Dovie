"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { warmAllScreens } from "@/components/prefetch";
import { applyTheme, useProfile } from "@/features/settings/use-profile";
import { fetchBillsDue } from "@/features/money/api";
import { todayInTimezone, relativeDay } from "@/lib/dates";

/**
 * Applies the saved theme and, if reminders are on and the browser allows
 * notifications, shows one local reminder a day about bills due soon. These
 * only fire while Dovie is open; nothing is sent in the background.
 */
export function Preferences() {
  const { query } = useProfile();
  const profile = query.data;
  const today = profile ? todayInTimezone(profile.timezone) : null;

  useEffect(() => {
    if (profile) applyTheme(profile.theme);
  }, [profile]);

  const qc = useQueryClient();
  useEffect(() => {
    if (today && profile?.onboarded_at) return warmAllScreens(qc, today);
  }, [qc, today, profile?.onboarded_at]);

  const remind =
    !!profile?.reminders_enabled && typeof Notification !== "undefined" && Notification.permission === "granted";
  const bills = useQuery({
    queryKey: ["bills-due", today],
    queryFn: () => fetchBillsDue(today as string),
    enabled: remind && !!today,
  });

  useEffect(() => {
    if (!remind || !today || !bills.data) return;
    const soon = bills.data.filter((b) => b.due_date <= today || relativeDay(b.due_date, today) === "tomorrow");
    if (soon.length === 0) return;
    const key = `dovie-reminded-${today}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    const first = soon[0];
    new Notification("A gentle bill reminder", {
      body:
        soon.length === 1
          ? `${first.title} is due ${relativeDay(first.due_date, today)}.`
          : `${soon.length} bills are due soon, starting with ${first.title}.`,
      icon: "/icon.svg",
      tag: key,
    });
  }, [remind, today, bills.data]);

  return null;
}
