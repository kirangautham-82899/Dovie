"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorNote } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { fetchEmailReminders, setEmailReminders } from "./api";

// Set NEXT_PUBLIC_EMAIL_REMINDERS=1 only once the sender is running
// (docs/bill-reminders.md), so nobody is offered emails that never arrive.
const AVAILABLE = process.env.NEXT_PUBLIC_EMAIL_REMINDERS === "1";

export function EmailRemindersSwitch({ profileId }: { profileId: string }) {
  return AVAILABLE ? <Switch profileId={profileId} /> : null;
}

function Switch({ profileId }: { profileId: string }) {
  const client = useQueryClient();
  const key = ["email-reminders", profileId];
  const query = useQuery({ queryKey: key, queryFn: fetchEmailReminders });
  const save = useMutation({
    mutationFn: (on: boolean) => setEmailReminders(profileId, on),
    onSuccess: (_, on) => client.setQueryData(key, on),
  });
  const on = save.isPending ? save.variables : (query.data ?? false);

  return (
    <div className="mt-4 border-t pt-4">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={!query.isSuccess || save.isPending}
        onClick={() => save.mutate(!on)}
        className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-60"
      >
        <span>
          <span className="block text-sm font-semibold">Email me the day before a bill is due</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Sent to your sign-in email, even when Dovie is closed. It includes bill names and amounts. Saves straight away.
          </span>
        </span>
        <span aria-hidden className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}>
          <span className={cn("absolute top-1 size-4 rounded-full bg-card shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
        </span>
      </button>
      {(query.error || save.error) && (
        <div className="mt-2">
          <ErrorNote message="Couldn't update email reminders just now." />
        </div>
      )}
    </div>
  );
}
