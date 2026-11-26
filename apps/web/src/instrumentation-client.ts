import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/monitoring/options";

// Browser error reports. See lib/monitoring/scrub.ts for what is removed.
if (SENTRY_DSN) Sentry.init(sentryOptions);
