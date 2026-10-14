"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { HeroPhone } from "@/components/hero-phone";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { clearAppCache } from "@/lib/app-cache";

const POINTS = [
  { icon: Sparkles, text: "Plans, habits, movement and money in one place" },
  { icon: Lock, text: "A journal encrypted in your browser" },
  { icon: ShieldCheck, text: "No bank connections, no ads" },
];

/**
 * The two-panel frame shared by sign-in, sign-up and onboarding: a blush panel
 * on the left (large screens only) and the form on the right, each with a slim
 * header bar, filling exactly one screen.
 */
export function SplitShell({
  aside,
  headerRight,
  footer,
  children,
  centered = true,
}: {
  aside: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Centre short forms vertically on large screens; long forms start at the top. */
  centered?: boolean;
}) {
  return (
    <main className="grid min-h-dvh lg:h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden min-h-0 flex-col overflow-hidden border-r bg-blush lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-primary/10 px-8">
          <Link href="/" aria-label="Dovie home">
            <Logo />
          </Link>
        </div>
        {aside}
      </section>

      <section className="flex min-h-0 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-5 sm:px-8">
          <Link href="/" className="lg:invisible" aria-label="Dovie home">
            <Logo />
          </Link>
          {headerRight}
        </div>
        <div
          className={cn(
            "flex flex-1 items-start justify-center overflow-y-auto px-5 pt-10 pb-8 sm:px-8",
            centered && "lg:items-center lg:py-8",
          )}
        >
          <div className="animate-rise w-full max-w-md">{children}</div>
        </div>
        {footer && <div className="shrink-0 border-t px-5 py-3 text-center text-[0.7rem] text-muted-foreground sm:px-8">{footer}</div>}
      </section>
    </main>
  );
}

export function LegalLine({ prefix = "By continuing you agree to the" }: { prefix?: string }) {
  return (
    <>
      {prefix}{" "}
      <Link href="/terms" className="underline underline-offset-2">
        terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2">
        privacy notice
      </Link>
      .
    </>
  );
}

export function AuthShell({
  title,
  subtitle,
  switchTo,
  children,
}: {
  title: string;
  subtitle: string;
  /** The other auth page, shown top-right: e.g. "New to Dovie?" + sign up. */
  switchTo: { prompt: string; label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <SplitShell
      aside={
        <>
          <div className="grid min-h-0 flex-1 items-center gap-6 px-8 py-6 xl:grid-cols-[1fr_auto] xl:px-10">
            <div>
              <p className="border-l-2 border-primary pl-2.5 text-[0.7rem] font-semibold tracking-[0.14em] text-primary uppercase">
                Your day, with a little more room
              </p>
              <p className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight xl:text-6xl">
                Slowly,
                <br />
                <em className="text-rose pr-1">one thing at a time.</em>
              </p>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                That is how a softer life is built. Everything you add stays yours to export or erase.
              </p>
            </div>
            <div className="hidden xl:block">
              <div className="origin-center scale-[0.86]">
                <HeroPhone cta={false} />
              </div>
            </div>
          </div>
          <ul className="grid shrink-0 grid-cols-3 divide-x border-t border-primary/10 bg-background/40 backdrop-blur-sm">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex flex-col gap-1.5 px-6 py-4 text-xs leading-snug">
                <Icon className="size-4 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </>
      }
      headerRight={
        <p className="text-sm text-muted-foreground">
          <span className="hidden sm:inline">{switchTo.prompt} </span>
          <Link href={switchTo.href} className="font-semibold text-primary underline-offset-4 hover:underline">
            {switchTo.label}
          </Link>
        </p>
      }
      footer={<LegalLine />}
    >
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </SplitShell>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.4 1.1 4.9L5.7 14Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.7 3.4-4.6 6.3-4.6Z" />
    </svg>
  );
}

/** Google sign-in through Supabase. Works for both new and returning people. */
export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    clearAppCache();
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={signIn} disabled={loading}>
        <GoogleIcon /> {loading ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
