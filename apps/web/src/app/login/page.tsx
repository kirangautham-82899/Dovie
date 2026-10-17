"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearAppCache } from "@/lib/app-cache";
import { AuthShell, GoogleButton } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

export default function LoginPage() {
  return (
    <AuthShell
      accent="sky"
      title="Welcome back"
      subtitle="Your corner kept your place for you."
      signoff="Waiting for you, Dovie"
      switchTo={{ prompt: "New to Dovie?", label: "Make a little space", href: "/signup" }}
    >
      <GoogleButton />
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error"));
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // A new sign-in starts with an empty cache, whoever used this browser before.
    clearAppCache();
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/today");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <Field label="Email address">
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" loading={loading} className="mt-1">
        {loading ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}
