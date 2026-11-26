// Sends "due tomorrow" bill emails through Resend. pg_cron calls this every
// hour; see docs/bill-reminders.md. Deployed with --no-verify-jwt, so the
// shared CRON_SECRET is what keeps everyone else out.
//
// Secrets: CRON_SECRET, RESEND_API_KEY, REMINDER_FROM, SITE_URL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { composeReminders, type DueBill } from "./compose.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const need = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

// Constant-time comparison, so the secret can't be guessed from response times.
async function sameSecret(a: string, b: string) {
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([hash(a), hash(b)]);
  return x.reduce((diff, byte, i) => diff | (byte ^ y[i]), 0) === 0;
}

// Resend allows two requests a second on the free plan.
const pause = () => new Promise((resolve) => setTimeout(resolve, 600));

Deno.serve(async (request) => {
  if (request.method !== "POST" || !(await sameSecret(request.headers.get("x-cron-secret") ?? "", need("CRON_SECRET")))) {
    return new Response("Not found", { status: 404 });
  }
  const apiKey = need("RESEND_API_KEY");
  const from = need("REMINDER_FROM");
  const siteUrl = need("SITE_URL");
  const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  const { data, error } = await supabase.rpc("claim_due_bill_reminders", { p_limit: 200 });
  if (error) {
    console.error(`claim failed: ${error.code}`);
    return Response.json({ error: "Could not read due bills." }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const email of composeReminders((data ?? []) as DueBill[], siteUrl)) {
    let ok = false;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          // A retry of the same reminder can't send a second copy.
          "idempotency-key": `bills/${email.dueDate}/${[...email.billIds].sort()[0]}/${email.billIds.length}`,
        },
        body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
      });
      ok = res.ok;
      // Status only: the reply can repeat the address.
      if (!ok) console.error(`resend replied ${res.status}`);
    } catch {
      console.error("resend could not be reached");
    }
    if (ok) sent++;
    else {
      failed++;
      const released = await supabase.rpc("release_bill_reminders", { p_bills: email.billIds, p_due: email.dueDate });
      if (released.error) console.error(`release failed: ${released.error.code}`);
    }
    await pause();
  }
  return Response.json({ sent, failed }, { status: failed && !sent ? 502 : 200 });
});
