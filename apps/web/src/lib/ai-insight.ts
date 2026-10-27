import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
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

const fail = (error: string, status: number) => Response.json({ error }, { status });

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
  // Gemini is used when GEMINI_API_KEY is set; otherwise Claude.
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return fail("AI insights aren't set up yet (add GEMINI_API_KEY or ANTHROPIC_API_KEY).", 503);
  }
  try {
    if (!(await allow(supabase, userId))) return fail("That's a lot of questions for one hour. Try again a little later.", 429);
  } catch {
    return fail("Couldn't check your request just now. Please try again.", 503);
  }

  const instructions = `${system}\n\n${SHARED_RULES}`;
  const payload = JSON.stringify(parsed.data);
  if (geminiKey) return askGemini(geminiKey, instructions, payload, output);

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Server-side fallback: if a safety classifier declines, the API retries
      // on Anthropic's recommended model for that category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(output) },
      system: instructions,
      messages: [{ role: "user", content: payload }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fail("Dovie couldn't read this just now. Please try again.", 502);
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail("AI insights aren't set up correctly (check ANTHROPIC_API_KEY).", 503);
    }
    if (error instanceof Anthropic.RateLimitError) return fail("Dovie is a little busy. Try again in a minute.", 429);
    if (error instanceof Anthropic.APIError) return fail("Dovie couldn't reach its AI right now.", 502);
    throw error;
  }
}

// Gemini's structured output takes plain JSON Schema; "$schema" isn't one of
// the keywords it accepts, so it is dropped.
function geminiSchema(output: z.ZodType): Record<string, unknown> {
  const schema: Record<string, unknown> = { ...z.toJSONSchema(output) };
  delete schema.$schema;
  return schema;
}

// Tried in order: the configured model, then fallbacks for when it is
// overloaded (Google returns 503 "high demand") or unavailable. Only the
// "-latest" aliases are used, because Google retires pinned versions
// (gemini-2.5-flash now returns 404); Flash-Lite usually has spare capacity.
const GEMINI_FALLBACKS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Logs Google's status and message (never the key) so failures can be
// diagnosed from the Vercel runtime logs.
function logGemini(model: string, what: string) {
  console.error(`[ask-dovie] gemini ${model}: ${what.slice(0, 300)}`);
}

async function askGemini(apiKey: string, instructions: string, payload: string, output: z.ZodType): Promise<Response> {
  const ai = new GoogleGenAI({ apiKey });
  const models = [...new Set([process.env.GEMINI_MODEL ?? GEMINI_FALLBACKS[0], ...GEMINI_FALLBACKS])];
  let rateLimited = false;

  for (const model of models) {
    // Two attempts per model: Google's "overloaded" errors are usually brief.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: payload,
          config: {
            systemInstruction: instructions,
            responseMimeType: "application/json",
            responseJsonSchema: geminiSchema(output),
          },
        });
        // No text means the answer was blocked or empty; malformed JSON is treated the same.
        let json: unknown = null;
        try {
          json = JSON.parse(response.text ?? "null");
        } catch {
          json = null;
        }
        const answer = output.safeParse(json);
        if (answer.success) return Response.json(answer.data);
        logGemini(model, `unusable reply (finish: ${response.candidates?.[0]?.finishReason ?? "none"})`);
        break; // try the next model
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 0;
        logGemini(model, `${status || "network"} ${error instanceof Error ? error.message : String(error)}`);
        if (status === 400 || status === 401 || status === 403) {
          return fail("AI insights aren't set up correctly (check GEMINI_API_KEY).", 503);
        }
        if (status === 429) rateLimited = true;
        if ((status >= 500 || status === 0) && attempt === 1) {
          await sleep(1500);
          continue; // retry the same model once
        }
        break; // 404 (model unavailable), 429 or a repeated failure: next model
      }
    }
  }
  if (rateLimited) return fail("Dovie is a little busy. Try again in a minute.", 429);
  return fail("Dovie couldn't reach its AI right now.", 502);
}
