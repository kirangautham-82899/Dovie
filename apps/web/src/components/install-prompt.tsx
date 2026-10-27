"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, PlusSquare, Share, X } from "lucide-react";
import { DoveMark } from "@/components/logo";
import { cn } from "@/lib/utils";

// Chrome/Edge/Samsung fire this before showing their own install UI.
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "install" | "ios" | "menu";

const DISMISSED_KEY = "dovie-install-dismissed";
const QUIET_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 2500;

// Pages where someone is mid-form (signing up, signing in, resetting a
// password, entering a code). A banner there would cover the button.
const QUIET_ROUTES = ["/onboarding", "/login", "/signup", "/forgot", "/reset-password", "/verify"];

// Screens with the phone bottom nav; the banner sits above it there.
const APP_ROUTES = ["/today", "/goals", "/money", "/journal", "/wellness", "/calendar", "/weekly", "/settings"];

function recentlyDismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < QUIET_FOR_MS;
  } catch {
    return false;
  }
}

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isPhoneOrTablet() {
  return window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 1024px)").matches;
}

function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Invites phone visitors to install Dovie on their home screen, where it opens
 * full-screen like an app. Android browsers get a one-tap Install button;
 * iPhone and iPad get the Share → Add to Home Screen steps (iOS has no install
 * API). Hidden once installed, and quiet for a week after "Not now".
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode | null>(null);
  const installEvent = useRef<InstallEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || recentlyDismissed() || !isPhoneOrTablet()) return;

    const timers: number[] = [];
    const later = (fn: () => void) => timers.push(window.setTimeout(fn, SHOW_AFTER_MS));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // show our banner instead of the browser's mini-infobar
      installEvent.current = e as InstallEvent;
      later(() => setMode("install"));
    };
    const onInstalled = () => setMode(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS()) {
      later(() => setMode("ios"));
    } else {
      // Browsers without the install event (e.g. Firefox) can still add to the
      // home screen from their menu; give them a gentle pointer after a while.
      timers.push(window.setTimeout(() => setMode((m) => m ?? (installEvent.current ? "install" : "menu")), 6000));
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Storage blocked: it simply shows again next visit.
    }
    setMode(null);
  }

  async function install() {
    const e = installEvent.current;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    installEvent.current = null;
    if (outcome === "accepted") setMode(null);
    else dismiss();
  }

  if (!mode || QUIET_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return null;
  const aboveNav = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  return (
    <div
      role="dialog"
      aria-label="Install the Dovie app"
      className={cn(
        "animate-rise fixed inset-x-3 z-40 mx-auto max-w-md",
        aboveNav ? "bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]",
      )}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-card/95 p-4 shadow-xl backdrop-blur-md dark:border-white/10">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <DoveMark className="size-11 shrink-0" />
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight">Get the Dovie app</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add it to your home screen. It opens full-screen, one tap away, like any app.
            </p>
          </div>
        </div>

        {mode === "install" && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Download className="size-4" /> Install app
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Not now
            </button>
          </div>
        )}

        {mode === "ios" && (
          <ol className="mt-3 divide-y border-y text-sm">
            <li className="flex items-center gap-2 py-2">
              <span className="text-rose font-serif">1</span> Tap
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-semibold">
                <Share className="size-3.5" /> Share
              </span>
              in the toolbar
            </li>
            <li className="flex items-center gap-2 py-2">
              <span className="text-rose font-serif">2</span> Choose
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-semibold">
                <PlusSquare className="size-3.5" /> Add to Home Screen
              </span>
            </li>
          </ol>
        )}

        {mode === "menu" && (
          <p className="mt-3 border-l-2 border-primary pl-3 text-sm">
            Open your browser menu <span className="font-semibold">⋮</span> and choose{" "}
            <span className="font-semibold">Install app</span> or <span className="font-semibold">Add to Home screen</span>.
          </p>
        )}
      </div>
    </div>
  );
}
