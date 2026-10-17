import { Suspense } from "react";
import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { Preferences } from "@/components/preferences";
import { AccentScope } from "@/components/accent-scope";

// Private, signed-in screens: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccentScope>
      {/* The same soft colour wash as the landing page, fixed behind every screen. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-float-slow absolute -top-40 right-[-8rem] size-[32rem] rounded-full bg-wash-1 opacity-50 blur-3xl dark:opacity-15" />
        <div className="animate-float absolute bottom-[-10rem] left-[10%] size-[28rem] rounded-full bg-wash-2 opacity-50 blur-3xl dark:opacity-15" />
        <div className="animate-float-slow absolute top-1/3 left-1/2 size-[22rem] rounded-full bg-wash-3 opacity-35 blur-3xl dark:opacity-10" />
      </div>
      <div className="flex-1 pb-24 lg:pb-0 lg:pl-60">{children}</div>
      <BottomNav />
      <Suspense>
        <Preferences />
      </Suspense>
    </AccentScope>
  );
}
