"use client";

import { usePathname } from "next/navigation";

/** One pastel colour per screen, so every page has its own mood. */
const ACCENTS: Record<string, string> = {
  today: "rose",
  goals: "lilac",
  money: "butter",
  journal: "sky",
  wellness: "mint",
  calendar: "peach",
  weekly: "lilac",
  settings: "sky",
};

/** Wraps the signed-in app and sets the accent colour for the current screen. */
export function AccentScope({ children }: { children: React.ReactNode }) {
  const screen = usePathname().split("/")[1] ?? "";
  return (
    <div data-accent={ACCENTS[screen] ?? "rose"} className="contents">
      {children}
    </div>
  );
}
