import { scrubEvent } from "./scrub";

// Shared by the browser, server and edge Sentry setups. Without a DSN nothing
// starts and nothing is sent.
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || null;

export const sentryOptions = {
  dsn: SENTRY_DSN ?? undefined,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only: no performance traces, replays, logs or breadcrumbs.
  maxBreadcrumbs: 0,
  beforeBreadcrumb: () => null,
  // The SDK collects all of these unless told not to.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
  },
  beforeSend: <T>(event: T) => scrubEvent(event),
};
