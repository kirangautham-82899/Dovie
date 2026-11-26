import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/monitoring/options";

// Server-side error reports, for both the Node and edge runtimes.
export function register() {
  if (SENTRY_DSN) Sentry.init(sentryOptions);
}

/** Errors from rendering, route handlers and the proxy. */
export const onRequestError = Sentry.captureRequestError;
