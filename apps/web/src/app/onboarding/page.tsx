"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<FocusAreaId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(id: FocusAreaId) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");

    const { error } = await supabase
      .from("profiles")
      .update({ focus_areas: selected, onboarded_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">What would you like to improve?</h1>
        <p className="text-sm text-muted-foreground">
          Pick as many as you like. You can change this later.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {FOCUS_AREAS.map((area) => {
          const on = selected.includes(area.id);
          return (
            <li key={area.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(area.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition-colors",
                  on ? "border-primary bg-secondary" : "hover:bg-muted",
                )}
              >
                <span>
                  <span className="block font-medium">{area.label}</span>
                  <span className="block text-sm text-muted-foreground">{area.hint}</span>
                </span>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {on && <Check className="size-4" aria-hidden />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="h-11" onClick={save} disabled={saving || selected.length === 0}>
        {saving ? "Setting up..." : "Continue"}
      </Button>
    </main>
  );
}
