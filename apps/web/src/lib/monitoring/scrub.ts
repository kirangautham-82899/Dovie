// What leaves the app in an error report. Dovie holds journal, health, cycle,
// mood, location and money data, so this keeps only what is needed to find a
// bug: the error type, a cleaned-up message, the stack and the page path.
// No app imports, so scripts/scrub-test.mjs can run it offline.

const RULES: [RegExp, string][] = [
  // Query strings and fragments can carry sign-in codes and tokens.
  [/\b(https?:\/\/[^\s?#"'`]+)[?#][^\s"'`]*/g, "$1"],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]"],
  [/[^\s@"'`<>()=]+@[^\s@"'`<>()=]+\.[a-z]{2,}/gi, "[email]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  // Postgres quotes row values as (column)=(value) and "Failing row contains (…)".
  [/=\([^)]*\)/g, "=([redacted])"],
  [/(failing row contains )\(.*\)/gi, "$1([redacted])"],
  // Anything quoted may be something a person typed.
  [/"(?:[^"\\\n]|\\.)*"/g, '"[text]"'],
  [/“[^”\n]*”/g, '"[text]"'],
  [/(?<![A-Za-z])'(?:[^'\\\n]|\\.)*'(?![A-Za-z])/g, "'[text]'"],
  [/`[^`\n]*`/g, "`[text]`"],
  // Coordinates, amounts, phone numbers.
  [/-?\d+\.\d{3,}/g, "[number]"],
  [/\d{5,}/g, "[number]"],
];

export function scrubText(text: string): string {
  return RULES.reduce((t, [pattern, to]) => t.replace(pattern, to), text).slice(0, 500);
}

/** A URL or path without its query string, fragment or record ids. */
export function scrubUrl(url: string): string {
  return scrubText(url.split(/[?#]/)[0]);
}

type Frame = { vars?: unknown };
type ScrubbableEvent = {
  message?: string;
  transaction?: string;
  exception?: { values?: { value?: string; stacktrace?: { frames?: Frame[] }; mechanism?: { data?: unknown } }[] };
  request?: { url?: string; method?: string };
  contexts?: Record<string, unknown>;
  user?: unknown;
  extra?: unknown;
  breadcrumbs?: unknown;
  logentry?: unknown;
  server_name?: unknown;
};

const SAFE_CONTEXTS = ["browser", "os", "device", "runtime", "app", "trace", "react", "culture"];

/** Used as Sentry's beforeSend: edits the event in place and returns it. */
export function scrubEvent<T>(event: T): T {
  const e = event as ScrubbableEvent;
  delete e.user;
  delete e.extra;
  delete e.breadcrumbs;
  delete e.logentry;
  delete e.server_name;
  if (e.message) e.message = scrubText(e.message);
  if (e.transaction) e.transaction = scrubUrl(e.transaction);
  for (const value of e.exception?.values ?? []) {
    if (value.value) value.value = scrubText(value.value);
    delete value.mechanism?.data;
    for (const frame of value.stacktrace?.frames ?? []) delete frame.vars;
  }
  // Headers, cookies and bodies never leave.
  if (e.request) {
    e.request = { method: e.request.method, url: e.request.url ? scrubUrl(e.request.url) : undefined };
  }
  if (e.contexts) {
    e.contexts = Object.fromEntries(Object.entries(e.contexts).filter(([key]) => SAFE_CONTEXTS.includes(key)));
  }
  return event;
}
