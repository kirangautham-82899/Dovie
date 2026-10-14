import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Shared server path for the "Ask Dovie" insights. Each route supplies the
// schema for what the browser may send (numbers and labels only) and a system
// prompt; this handles auth, limits, the Claude call and every failure mode.

export const Insight = z.object({
  headline: z.string().describe("One warm sentence that sums up the picture."),
  observations: z.array(z.string()).describe("Two or three specific observations, using the numbers given."),
  nudge: z.string().describe("One small, practical thing to try this week."),
});

export type Insight = z.infer<typeof Insight>;

const SHARED_RULES = `Use only the numbers you are given; don't invent figures or reasons. When data is thin or confidence is low, say the picture is still forming. Keep the tone kind and free of judgment, and keep suggestions small and everyday. This is not medical or financial advice, so don't give any.`;

// Best-effort guard against runaway cost: 10 requests per user per hour on
// each server instance. Serverless instances don't share this map.
const recent = new Map<string, number[]>();
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

function allow(userId: string) {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) return false;
  hits.push(now);
  recent.set(userId, hits);
  return true;
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function insightResponse<T>(request: Request, input: z.ZodType<T>, system: string): Promise<Response> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return fail("Please sign in again.", 401);

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("That summary looks incomplete.", 400);

  // On Vercel the key comes from the project's environment variables.
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return fail("AI insights aren't set up yet (missing ANTHROPIC_API_KEY).", 503);
  }
  if (!allow(userId)) return fail("That's a lot of questions for one hour. Try again a little later.", 429);

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Server-side fallback: if a safety classifier declines, the API retries
      // on Anthropic's recommended model for that category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Insight) },
      system: `${system}\n\n${SHARED_RULES}`,
      messages: [{ role: "user", content: JSON.stringify(parsed.data) }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fail("Dovie couldn't read this just now. Please try again.", 502);
    }
    return Response.json(response.parsed_output satisfies Insight);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail("AI insights aren't set up correctly (check ANTHROPIC_API_KEY).", 503);
    }
    if (error instanceof Anthropic.RateLimitError) return fail("Dovie is a little busy. Try again in a minute.", 429);
    if (error instanceof Anthropic.APIError) return fail("Dovie couldn't reach its AI right now.", 502);
    throw error;
  }
}
