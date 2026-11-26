import { z } from "zod";
import { askModel, configuredProviders, fail, notSetUp } from "@/lib/ai-providers";
import { reportFailure } from "@/lib/monitoring/report";
import { createClient } from "@/lib/supabase/server";

// Shared server path for the "Ask Dovie" insights. Each route supplies the
// schema for what the browser may send (numbers and labels only) and a system
// prompt; this handles auth, limits, the model call (Gemini or Claude) and
// every failure mode.

export const Insight = z.object({
  headline: z.string().describe("One warm sentence that sums up the picture."),
  observations: z.array(z.string()).describe("Two or three specific observations, using the numbers given."),
  nudge: z.string().describe("One small, practical thing to try this week."),
});

export type Insight = z.infer<typeof Insight>;

const SHARED_RULES = `Use only the numbers you are given; don't invent figures or reasons. When data is thin or confidence is low, say the picture is still forming. Keep the tone kind and free of judgment, and keep suggestions small and everyday. This is not medical or financial advice, so don't give any.`;

// Guard against runaway cost: 10 requests per user per hour, counted in the
// database (claim_ai_request) so every server instance shares one limit. Until
// that migration has run, a per-instance count stands in.
const LIMIT = 10;
const WINDOW_MINUTES = 60;
const recent = new Map<string, number[]>();

function allowLocally(userId: string) {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MINUTES * 60_000);
  if (hits.length >= LIMIT) return false;
  hits.push(now);
  recent.set(userId, hits);
  return true;
}

async function allow(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase.rpc("claim_ai_request", { p_limit: LIMIT, p_window_minutes: WINDOW_MINUTES });
  if (!error) return data === true;
  if (error.code === "PGRST202" || error.code === "42883") return allowLocally(userId);
  throw new Error(error.message);
}

/** The summaries are a few hundred bytes; anything far bigger isn't from the app. */
const MAX_BODY_BYTES = 16_000;

async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * `output` is the shape of the answer; it defaults to the short Insight. Any
 * other schema must be a JSON-Schema-friendly object (no refinements).
 */
export async function insightResponse<T>(
  request: Request,
  input: z.ZodType<T>,
  system: string,
  output: z.ZodType = Insight,
): Promise<Response> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return fail("Please sign in again.", 401);

  const parsed = input.safeParse(await readJson(request));
  if (!parsed.success) return fail("That summary looks incomplete.", 400);

  // On Vercel the keys come from the project's environment variables.
  const providers = configuredProviders();
  if (!providers.gemini && !providers.claude) return notSetUp();
  try {
    if (!(await allow(supabase, userId))) return fail("That's a lot of questions for one hour. Try again a little later.", 429);
  } catch (error) {
    reportFailure(error, { area: "ask-dovie", step: "rate-limit" });
    return fail("Couldn't check your request just now. Please try again.", 503);
  }

  const response = await askModel(`${system}

${SHARED_RULES}`, JSON.stringify(parsed.data), output);
  // Only the status is reported, never the summary or the reply.
  if (response.status >= 500) {
    reportFailure(new Error("Ask Dovie could not get an answer"), { area: "ask-dovie", step: "model", status: String(response.status) });
  }
  return response;
}
