// Checks that nothing personal survives in an error report.
// Run from apps/web:  npm run test:scrub   (no Supabase or Sentry needed)
import { scrubEvent, scrubText, scrubUrl } from "../src/lib/monitoring/scrub.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};
const without = (text, ...secrets) => secrets.every((s) => !text.includes(s));

const cases = [
  ["emails", "No profile for asha.rao+x@example.co.in here", ["asha", "example.co.in"]],
  ["quoted text", `invalid value "I felt anxious today" in 'my secret note'`, ["anxious", "secret"]],
  ["Postgres key values", "duplicate key: Key (title)=(Call the clinic) already exists", ["clinic"]],
  ["Postgres failing rows", "Failing row contains (1, heavy flow, cramps (bad)).", ["cramps", "heavy"]],
  ["coordinates and long numbers", "bad point 12.971598, 77.594566 for 9876543210", ["971598", "594566", "9876543210"]],
  ["tokens in query strings", "GET https://x.test/auth/callback?code=abc123secret failed", ["abc123secret"]],
  ["JWTs", "token eyJhbGciOi.eyJzdWIiOiIx.c2lnbmF0dXJl rejected", ["eyJzdWIi"]],
];
for (const [name, input, secrets] of cases) {
  const out = scrubText(input);
  check(`removes ${name}`, without(out, ...secrets), out);
}

check("keeps ordinary messages readable", scrubText("Cannot read properties of undefined") === "Cannot read properties of undefined");
check("keeps apostrophes in words", scrubText("can't load the user's page") === "can't load the user's page");
check("paths lose their query", scrubUrl("/reset-password?token=abc#frag") === "/reset-password");

const event = scrubEvent({
  message: "for a@b.com",
  user: { email: "a@b.com", ip_address: "1.2.3.4" },
  extra: { note: "private" },
  breadcrumbs: [{ message: "private" }],
  server_name: "host-name",
  request: { method: "POST", url: "https://x.test/api?q=private", headers: { cookie: "private" }, data: "private", cookies: "private" },
  contexts: { browser: { name: "Chrome" }, state: { journal: "private" } },
  exception: { values: [{ value: 'bad "private"', stacktrace: { frames: [{ function: "save", vars: { note: "private" } }] } }] },
});
const flat = JSON.stringify(event);
check("whole events carry nothing personal", without(flat, "private", "a@b.com", "1.2.3.4", "host-name"), flat);
check("events keep what is needed to debug", flat.includes("Chrome") && flat.includes("save") && flat.includes("https://x.test/api"), flat);

process.exit(failed ? 1 : 0);
