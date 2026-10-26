// Canonical site details for metadata, the sitemap and structured data.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set automatically at build time;
// set NEXT_PUBLIC_SITE_URL to use a custom domain instead.

const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** A full http(s) address, or null for empty or malformed values. */
function validUrl(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

const configured = process.env.NEXT_PUBLIC_SITE_URL;
if (configured?.trim() && !validUrl(configured)) {
  // A wrong value (e.g. a project ID) would otherwise crash every page.
  console.warn(`NEXT_PUBLIC_SITE_URL must be a full URL like https://dovie.app; ignoring "${configured}".`);
}

export const SITE_URL =
  validUrl(configured) ?? (vercel ? `https://${vercel}` : "http://localhost:3000");

export const SITE_NAME = "Dovie";

export const SITE_TITLE = "Dovie: Daily Planner, Habit Tracker & Budget App";

export const SITE_DESCRIPTION =
  "Dovie is a free daily planner, to-do list and habit tracker with an expense tracker, budget planner, mood and sleep tracker, and a private journal. Plan your day, build habits, track spending in ₹ and reflect, all in one gentle app.";

export const SITE_KEYWORDS = [
  "daily planner app",
  "to-do list app",
  "habit tracker",
  "habit tracker app free",
  "expense tracker",
  "expense tracker India",
  "budget planner",
  "personal finance app",
  "money manager app",
  "private journal app",
  "gratitude journal",
  "digital diary",
  "mood tracker",
  "sleep tracker",
  "water intake tracker",
  "focus timer",
  "pomodoro timer",
  "self-care app",
  "wellness app",
  "productivity app",
  "goal tracker",
  "weekly planner",
  "spending forecast",
];
