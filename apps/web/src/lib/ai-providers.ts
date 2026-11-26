import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

// The model calls behind "Ask Dovie". Kept free of app imports so that
// scripts/ai-test.mjs can run it offline against a stubbed network.
// Model names change over time: check both providers' lists before a release.

export const CLAUDE_MODEL = "claude-opus-5-5";

export const fail = (error: string, status: number) => Response.json({ error }, { status });

// Logs the provider's status and message (never the key or what was sent) so
// failures can be diagnosed from the Vercel runtime logs.
function logProvider(provider: "gemini" | "claude", model: string, what: string) {
  console.warn(`[ask-dovie] ${provider} ${model}: ${what.slice(0, 300)}`);
}

const NOT_SET_UP = "AI insights aren't set up yet (add GEMINI_API_KEY or ANTHROPIC_API_KEY).";

export type ProviderKeys = { gemini: boolean; claude: boolean };

export function configuredProviders(): ProviderKeys {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  };
}

export const notSetUp = () => fail(NOT_SET_UP, 503);

/**
 * Asks Gemini first when it is configured, and Claude if Gemini can't answer
 * (or isn't configured). Every failure comes back as a friendly JSON error.
 */
export async function askModel(instructions: string, payload: string, output: z.ZodType): Promise<Response> {
  const { gemini, claude } = configuredProviders();
  if (!gemini && !claude) return notSetUp();
  if (gemini) {
    let answer: Response;
    try {
      answer = await askGemini(process.env.GEMINI_API_KEY!, instructions, payload, output);
    } catch (error) {
      if (!claude) throw error;
      return askClaude(instructions, payload, output);
    }
    if (answer.ok || !claude) return answer;
  }
  return askClaude(instructions, payload, output);
}

// The route is a serverless function, so a stuck request must give up well
// before the platform does.
const CLAUDE_TIMEOUT_MS = 45_000;

async function askClaude(instructions: string, payload: string, output: z.ZodType): Promise<Response> {
  try {
    const client = new Anthropic({ timeout: CLAUDE_TIMEOUT_MS, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
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
      logProvider("claude", CLAUDE_MODEL, `unusable reply (stop: ${response.stop_reason})`);
      return fail("Dovie couldn't read this just now. Please try again.", 502);
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? (error.status ?? 0) : 0;
    logProvider("claude", CLAUDE_MODEL, `${status || "network or unreadable reply"} ${error instanceof Error ? error.name : "error"}`);
    if (error instanceof Anthropic.AuthenticationError) {
      return fail("AI insights aren't set up correctly (check ANTHROPIC_API_KEY).", 503);
    }
    if (error instanceof Anthropic.RateLimitError) return fail("Dovie is a little busy. Try again in a minute.", 429);
    if (error instanceof Anthropic.APIError) return fail("Dovie couldn't reach its AI right now.", 502);
    // A reply that was cut off or didn't match the schema.
    if (error instanceof Anthropic.AnthropicError) return fail("Dovie couldn't read this just now. Please try again.", 502);
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
        logProvider("gemini", model, `unusable reply (finish: ${response.candidates?.[0]?.finishReason ?? "none"})`);
        break; // try the next model
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 0;
        logProvider("gemini", model, `${status || "network"} ${error instanceof Error ? error.message : String(error)}`);
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
