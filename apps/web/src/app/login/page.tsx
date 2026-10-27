"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearAppCache } from "@/lib/app-cache";
import { AuthShell, GoogleButton } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

/** Messages for the `?error=` codes other pages send here. Anything else gets the generic one. */
const URL_ERRORS: Record<string, string> = {
  link: "That sign-in link didn't work or has expired. Please try again.",
};
const urlError = (code: string | null) => (code ? (URL_ERRORS[code] ?? URL_ERRORS.link) : null);

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
  const [error, setError] = useState<string | null>(urlError(params.get("error")));
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // A new sign-in starts with an empty cache, whoever used this browser before.
    clearAppCache();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    // People with two-step verification still need their code.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);
    router.replace(aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2" ? "/verify" : "/today");
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
      <Link href="/forgot" className="-mt-1.5 self-end text-xs font-semibold text-secondary-foreground underline-offset-4 hover:underline">
        Forgot password?
      </Link>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" loading={loading} className="mt-1">
        {loading ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}
