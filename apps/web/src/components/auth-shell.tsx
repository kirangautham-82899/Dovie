"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Feather, Heart, Target } from "lucide-react";
import { Logo } from "@/components/logo";
import { DoveLetter } from "@/components/dove-letter";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { clearAppCache } from "@/lib/app-cache";

type Accent = "rose" | "mint" | "lilac" | "sky" | "butter" | "peach";

/**
 * The two-panel frame used by onboarding: a blush panel on the left (large
 * screens only) and the form on the right, each with a slim header bar,
 * filling exactly one screen.
 */
export function SplitShell({
  aside,
  headerRight,
  footer,
  children,
  centered = true,
  accent = "rose",
}: {
  aside: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Centre short forms vertically on large screens; long forms start at the top. */
  centered?: boolean;
  accent?: Accent;
}) {
  return (
    <main data-accent={accent} className="grid min-h-dvh lg:h-dvh lg:grid-cols-[1.15fr_1fr]">
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

const NOTES = {
  left: [
    { icon: Target, label: "Goals", text: "Pick one thing you would love to finish this week. Just one.", tilt: "-rotate-2" },
    { icon: Compass, label: "Aims", text: "Small steps, kept gently. Slow is still a direction.", tilt: "rotate-1" },
  ],
  right: [
    { icon: Heart, label: "Motivation", text: "You do not have to do it all. You only have to begin.", tilt: "rotate-2" },
    { icon: Feather, label: "A little note", text: "Rest counts too. Your streak will wait for you.", tilt: "-rotate-1" },
  ],
};

/** A small pinned note beside the letter. */
function Note({ icon: Icon, label, text, tilt }: { icon: typeof Target; label: string; text: string; tilt: string }) {
  return (
    <aside className={cn("rounded-2xl bg-secondary p-4 shadow-soft transition-transform duration-300 hover:rotate-0", tilt)}>
      <p className="flex items-center gap-1.5 text-[0.66rem] font-bold tracking-[0.16em] text-secondary-foreground uppercase">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-2 font-serif text-lg leading-snug">{text}</p>
    </aside>
  );
}

/**
 * Sign-in and sign-up: the form is a letter, carried in by the dove. One
 * pastel colour per page, passed as `accent`.
 */
export function AuthShell({
  title,
  subtitle,
  switchTo,
  accent,
  signoff,
  children,
}: {
  title: string;
  subtitle: string;
  /** The other auth page, shown top-right: e.g. "New to Dovie?" + sign up. */
  switchTo?: { prompt: string; label: string; href: string };
  accent: Accent;
  signoff: string;
  children: React.ReactNode;
}) {
  return (
    <main data-accent={accent} className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-float-slow absolute -top-32 -left-24 size-[26rem] rounded-full bg-wash-1 opacity-60 blur-3xl dark:opacity-20" />
        <div className="animate-float absolute -right-28 bottom-0 size-[24rem] rounded-full bg-wash-2 opacity-50 blur-3xl dark:opacity-15" />
        <div className="animate-float-slow absolute top-1/2 left-1/2 size-[16rem] -translate-x-1/2 rounded-full bg-wash-3 opacity-30 blur-3xl dark:opacity-10" />
      </div>

      <header className="mx-auto flex h-11 w-full max-w-6xl shrink-0 items-center justify-between px-5">
        <Link href="/" aria-label="Dovie home">
          <Logo />
        </Link>
        {switchTo && (
          <p className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">{switchTo.prompt} </span>
            <Link href={switchTo.href} className="font-semibold text-secondary-foreground underline-offset-4 hover:underline">
              {switchTo.label}
            </Link>
          </p>
        )}
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 pb-2 grid-cols-[minmax(0,1fr)] lg:grid-cols-[1fr_24rem_1fr]">
        <div className="hidden flex-col gap-5 lg:flex">
          {NOTES.left.map((n) => (
            <Note key={n.label} {...n} />
          ))}
        </div>

        <div className="animate-rise mx-auto w-full min-w-0 max-w-sm">
          <DoveLetter still>
            <p className="font-serif text-base text-muted-foreground italic">Dear you,</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-4">{children}</div>
            <p className="mt-4 text-right font-serif text-base text-muted-foreground italic">{signoff}</p>
          </DoveLetter>
          {/* Phones: the same notes, as a swipeable row under the letter. */}
          <div className="-mx-5 mt-5 flex snap-x gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] lg:hidden">
            {[...NOTES.right, ...NOTES.left].map((n) => (
              <div key={n.label} className="w-60 shrink-0 snap-start">
                <Note {...n} tilt="" />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden flex-col gap-5 lg:flex">
          {NOTES.right.map((n) => (
            <Note key={n.label} {...n} />
          ))}
        </div>
      </div>

      <footer className="shrink-0 px-5 py-2 text-center text-[0.7rem] text-muted-foreground">
        <LegalLine />
      </footer>
    </main>
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
