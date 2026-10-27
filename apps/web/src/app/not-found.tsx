import Link from "next/link";
import { DoveMark, Logo } from "@/components/logo";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="dot-paper flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <Link href="/" aria-label="Dovie home" className="absolute top-5 left-5">
        <Logo />
      </Link>
      <DoveMark className="size-16 opacity-80" />
      <div>
        <p className="font-hand text-2xl text-muted-foreground">page 404</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">
          This page flew <em className="text-rose pr-1">away.</em>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          The link may be old or mistyped. Everything you&apos;ve saved in Dovie is still right where you left it.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/today"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Go to my day
        </Link>
        <Link href="/" className="rounded-full border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted">
          Dovie home
        </Link>
      </div>
    </main>
  );
}
