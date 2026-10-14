"use client";

// Shared by every signed-in screen: page files stay static (their shells are
// prerendered and appear instantly) and the profile + local date come from one
// cached query instead of a server round trip per navigation. Each screen has
// its own small view file so a page only compiles and ships its own code.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote } from "@/components/page-header";
import { useProfile } from "@/features/settings/use-profile";
import type { Profile } from "@/features/settings/api";
import { todayInTimezone } from "@/lib/dates";

export type Ctx = { profile: Profile; today: string };

/** A soft placeholder in the shape of a ruled screen. */
export function ViewSkeleton({ columns = 2 }: { columns?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="ruled grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 p-5">
            <div className="h-2.5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
      <div className={columns === 2 ? "ruled lg:grid-cols-2" : "ruled"}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="space-y-3 p-6">
            <div className="h-4 w-36 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-full animate-pulse rounded-full bg-muted/70" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted/70" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TodayGate({ children, skeleton }: { children: (ctx: Ctx) => React.ReactNode; skeleton?: React.ReactNode }) {
  const router = useRouter();
  const { query } = useProfile();
  const profile = query.data;
  const needsOnboarding = !!profile && !profile.onboarded_at;

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (query.isError) {
    return <ErrorNote message={`Could not load your profile: ${query.error.message}`} onRetry={() => query.refetch()} />;
  }
  if (!profile || needsOnboarding) return <>{skeleton ?? <ViewSkeleton />}</>;
  return <>{children({ profile, today: todayInTimezone(profile.timezone) })}</>;
}

