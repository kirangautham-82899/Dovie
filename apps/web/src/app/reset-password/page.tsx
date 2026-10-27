"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { cn } from "@/lib/utils";

/** Reached from a reset email (the callback signs the person in first). */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const long = pw.length >= 10;
  const mixed = /[a-z]/i.test(pw) && /[0-9\W]/.test(pw);
  const valid = long && mixed && pw === again;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/today");
    router.refresh();
  }

  return (
    <AuthShell accent="mint" title="Choose a new password" subtitle="Make it long, and only for Dovie." signoff="Fresh start, Dovie">
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Field label="New password">
          <Input type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Type it again">
          <Input
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={!!again && again !== pw}
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </Field>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {[
            { ok: long, label: "10+ characters" },
            { ok: mixed, label: "a number or symbol" },
            { ok: !!again && pw === again, label: "both match" },
          ].map((r) => (
            <li key={r.label} className={cn("flex items-center gap-1", r.ok ? "text-mint-foreground" : "text-muted-foreground")}>
              <Check className={cn("size-3", !r.ok && "opacity-30")} /> {r.label}
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={!valid}>
          {loading ? "Saving…" : "Save and continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
