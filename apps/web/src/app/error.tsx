"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DoveMark } from "@/components/logo";

/** Shown when a screen crashes. The rest of the app, and the person's data, are fine. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-5 text-center">
      <DoveMark className="size-14 opacity-80" />
      <div>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">
          Something slipped. <em className="text-rose pr-1">Not you.</em>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          This screen hit a snag. Your data is safe; trying again usually sorts it out.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[0.7rem] text-muted-foreground">ref {error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link href="/today" className="rounded-full border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted">
          Back to my day
        </Link>
      </div>
    </main>
  );
}
