"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdult) return setError("You must be 18 or older to use Dovie.");
    setLoading(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { display_name: name, is_adult_confirmed: true } },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (!data.session) {
      return setError("Check your email to confirm your account, then sign in.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Join Dovie</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Input
              placeholder="Your name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password (min 8 characters)"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAdult} onCheckedChange={(v) => setIsAdult(v === true)} />
              I am 18 years or older
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
