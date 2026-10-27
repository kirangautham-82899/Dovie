"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    // Rate limits are worth showing; "no such account" is not, so nobody can
    // use this page to find out who has a Dovie account.
    if (error && error.status === 429) return setError("Too many tries. Please wait a few minutes and try again.");
    setSent(true);
  }

  return (
    <AuthShell
      accent="butter"
      title="Forgot your password?"
      subtitle="It happens. We'll email you a link to choose a new one."
      signoff="Here to help, Dovie"
      switchTo={{ prompt: "Remembered it?", label: "Sign in", href: "/login" }}
    >
      {sent ? (
        <div className="space-y-3 text-sm">
          <p>
            If <span className="font-semibold">{email}</span> has a Dovie account, a reset link is on its way. It works
            once and expires soon.
          </p>
          <p className="text-muted-foreground">No email after a few minutes? Check spam, or try again.</p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
            Send another link
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <Field label="Email address">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" loading={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <Link href="/login" className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
