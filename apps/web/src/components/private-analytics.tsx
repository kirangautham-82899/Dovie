"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Cookieless page-view counts (Vercel Web Analytics). Query strings and
 * fragments are removed first, as they can carry sign-in codes.
 */
export function PrivateAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: event.url.split(/[?#]/)[0] })} />;
}
