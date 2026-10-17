"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearAppCache } from "@/lib/app-cache";
import { AuthShell, GoogleButton } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/field";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdult) return setError("Dovie is currently for adults, 18 and over.");
    setLoading(true);
    setError(null);
    clearAppCache();
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, is_adult_confirmed: true },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (!data.session) {
      return setNotice("Check your email for a confirmation link. It will bring you straight back here.");
    }
    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <AuthShell
      accent="lilac"
      title="Make a little space"
      subtitle="Say hello, and we will hold a spot for you."
      signoff="Glad you came, Dovie"
      switchTo={{ prompt: "Already have an account?", label: "Sign in", href: "/login" }}
    >
      <GoogleButton />
      {notice ? (
        <p className="border-l-2 border-primary py-1 pl-3 text-sm">{notice}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <Field label="Your name">
            <Input autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email address">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox className="mt-0.5" checked={isAdult} onCheckedChange={(v) => setIsAdult(v === true)} />
            <span>
              I am 18 or older and agree to the{" "}
              <Link href="/terms" className="underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                privacy notice
              </Link>
              .
            </span>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" loading={loading} className="mt-1">
            {loading ? "Making space…" : "Continue"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
