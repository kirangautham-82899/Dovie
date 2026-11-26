import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

/**
 * Reports a failure a route handled itself, so it doesn't pass unnoticed. Call
 * it while handling a request. Tags must never hold anything a person typed.
 */
export function reportFailure(error: unknown, tags: Record<string, string>) {
  Sentry.captureException(error, { tags });
  // A serverless function can be frozen once it has replied; send first.
  after(() => Sentry.flush(2000));
}
