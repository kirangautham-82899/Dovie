"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookHeart,
  CalendarDays,
  ListChecks,
  Ellipsis,
  Activity,
  HeartPulse,
  LineChart,
  LogOut,
  Settings,
  Sun,
  Target,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { signOutAndLeave } from "@/lib/sign-out";
import { useProfile } from "@/features/settings/use-profile";
import { todayInTimezone } from "@/lib/dates";
import { prefetchScreen } from "@/components/prefetch";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/planner", label: "Planner", icon: ListChecks },
  { href: "/fitness", label: "Fitness", icon: Activity },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/journal", label: "Journal", icon: BookHeart },
  { href: "/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/weekly", label: "Weekly review", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Phones show the first four tabs; the rest live behind "More".
const PRIMARY = TABS.slice(0, 4);
const MORE = TABS.slice(4);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A bordered sidebar on large screens, a bordered bottom bar on phones. */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((t) => isActive(pathname, t.href));
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const profile = useProfile().query.data;
  const today = profile ? todayInTimezone(profile.timezone) : null;
  // Start loading a screen's data as soon as the pointer or finger heads to it.
  const warm = (href: string) => ({
    onMouseEnter: () => prefetchScreen(qc, href, today),
    onFocus: () => prefetchScreen(qc, href, today),
    onTouchStart: () => prefetchScreen(qc, href, today),
  });

  function signOut() {
    setSigningOut(true);
    void signOutAndLeave();
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-background/85 backdrop-blur-md lg:flex">
        <Link href="/today" className="flex h-16 items-center border-b px-5">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex-1 py-3">
          <ul>
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    {...warm(href)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 border-l-[3px] px-5 py-2.5 text-sm transition-colors",
                      active
                        ? "border-primary bg-secondary/70 font-semibold text-primary"
                        : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex items-center gap-3 border-t border-l-[3px] border-l-transparent px-5 py-3.5 text-sm text-muted-foreground transition-colors hover:border-l-destructive/60 hover:text-destructive disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </aside>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {moreOpen && (
          <ul className="grid grid-cols-2 border-b">
            {MORE.map(({ href, label, icon: Icon }, i) => (
              <li key={href} className={cn(i % 2 === 0 && "border-r", i < MORE.length - 2 && "border-b")}>
                <Link
                  href={href}
                  {...warm(href)}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm",
                    isActive(pathname, href) ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
            <li className="col-span-2 border-t">
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-destructive disabled:opacity-60"
              >
                <LogOut className="size-4" aria-hidden />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </li>
          </ul>
        )}
        <ul className="mx-auto flex max-w-md items-stretch">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  {...warm(href)}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mt-px flex flex-col items-center gap-0.5 border-t-2 px-1 pt-2 pb-2 text-[0.68rem] font-semibold transition-colors",
                    active ? "border-primary text-primary" : "border-transparent text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(
                "-mt-px flex w-full flex-col items-center gap-0.5 border-t-2 px-1 pt-2 pb-2 text-[0.68rem] font-semibold transition-colors",
                moreActive || moreOpen ? "border-primary text-primary" : "border-transparent text-muted-foreground",
              )}
            >
              <Ellipsis className="size-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
