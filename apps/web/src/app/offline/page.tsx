import Link from "next/link";
import { DoveMark } from "@/components/logo";

export const metadata = { title: "You're offline", robots: { index: false, follow: false } };

/**
 * Shown by the service worker when a page that was never opened before is
 * requested without a connection. Pages you've already visited open as usual.
 */
export default function OfflinePage() {
  return (
    <main className="dot-paper flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <DoveMark className="size-16 opacity-80" />
      <div>
        <p className="font-hand text-2xl text-muted-foreground">no signal</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">
          You&apos;re <em className="text-rose pr-1">offline.</em>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Dovie can&apos;t reach the internet right now. Screens you&apos;ve opened before still open with what&apos;s saved
          on this device. This one needs a connection the first time, so try again once you&apos;re back online.
        </p>
      </div>
      <Link
        href="/today"
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </Link>
    </main>
  );
}
