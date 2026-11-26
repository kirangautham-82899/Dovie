// Checks "Ask Dovie" against a stubbed network: each provider, model fail-over,
// provider fail-over and the friendly errors. No keys are used and nothing is
// sent anywhere. Run from apps/web:  npm run test:ai
import { z } from "zod";
import { askModel, CLAUDE_MODEL } from "../src/lib/ai-providers.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};
// The provider logs are expected here; keep the output to the results.
console.warn = () => {};

const Output = z.object({ headline: z.string() });
const good = JSON.stringify({ headline: "A steady week." });
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-should-retry": "false" } });

const gemini = {
  ok: () => json({ candidates: [{ content: { role: "model", parts: [{ text: good }] }, finishReason: "STOP" }] }),
  error: (status) => json({ error: { code: status, message: "stub", status: "STUB" } }, status),
};
const claude = {
  reply: (text, stop = "end_turn") =>
    json({
      id: "msg_stub",
      type: "message",
      role: "assistant",
      model: CLAUDE_MODEL,
      content: [{ type: "text", text }],
      stop_reason: stop,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  error: (status) => json({ type: "error", error: { type: "api_error", message: "stub" } }, status),
};

let calls = [];
let handlers = {};
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  const body = init?.body ? JSON.parse(init.body) : null;
  const headers = new Headers(init?.headers);
  const provider = url.includes("anthropic") ? "claude" : "gemini";
  const model = provider === "claude" ? body?.model : /models\/([^:]+):/.exec(url)?.[1];
  calls.push({ provider, model, body, headers, url });
  return handlers[provider](model);
};

async function run(env, stubs) {
  for (const key of ["GEMINI_API_KEY", "GEMINI_MODEL", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL"]) delete process.env[key];
  Object.assign(process.env, env);
  calls = [];
  handlers = stubs;
  const res = await askModel("system", "{}", Output);
  return { status: res.status, body: await res.json() };
}
const GEMINI = { GEMINI_API_KEY: "stub" };
const CLAUDE = { ANTHROPIC_API_KEY: "stub" };
const used = () => calls.map((c) => `${c.provider}:${c.model}`).join(" ");

let r = await run({}, {});
check("no provider: friendly 503, no calls", r.status === 503 && /aren't set up/.test(r.body.error) && calls.length === 0, JSON.stringify(r));

r = await run(CLAUDE, { claude: () => claude.reply(good) });
check("Claude alone answers", r.status === 200 && r.body.headline === "A steady week.", JSON.stringify(r));
const sent = calls[0];
check(
  "Claude request has the model, beta flag, fallbacks and schema",
  sent?.body.model === CLAUDE_MODEL &&
    sent.headers.get("anthropic-beta")?.includes("server-side-fallback-2026-07-01") &&
    sent.body.fallbacks === "default" &&
    sent.body.output_config?.effort === "low" &&
    sent.body.output_config?.format?.type === "json_schema",
  JSON.stringify(sent?.body),
);

r = await run(CLAUDE, { claude: () => claude.reply("", "refusal") });
check("Claude refusal is friendly", r.status === 502 && /couldn't read/.test(r.body.error), JSON.stringify(r));
r = await run(CLAUDE, { claude: () => claude.reply('{"headline": "cut o', "max_tokens") });
check("Claude cut-off reply is friendly", r.status === 502, JSON.stringify(r));
r = await run(CLAUDE, { claude: () => claude.error(401) });
check("Claude bad key names the variable", r.status === 503 && /ANTHROPIC_API_KEY/.test(r.body.error), JSON.stringify(r));
r = await run(CLAUDE, { claude: () => claude.error(429) });
check("Claude rate limit is a 429", r.status === 429, JSON.stringify(r));

r = await run(GEMINI, { gemini: gemini.ok });
check("Gemini alone answers", r.status === 200 && used() === "gemini:gemini-flash-latest", used());
r = await run(GEMINI, { gemini: (m) => (m === "gemini-flash-latest" ? gemini.error(404) : gemini.ok()) });
check("a retired Gemini model fails over to the next", r.status === 200 && used().endsWith("gemini:gemini-flash-lite-latest"), used());
r = await run({ ...GEMINI, GEMINI_MODEL: "my-model" }, { gemini: gemini.ok });
check("GEMINI_MODEL is tried first", used() === "gemini:my-model", used());
r = await run(GEMINI, { gemini: () => gemini.error(404) });
check("all Gemini models down: friendly 502", r.status === 502 && /couldn't reach/.test(r.body.error), JSON.stringify(r));
r = await run(GEMINI, { gemini: () => gemini.error(403) });
check("Gemini bad key names the variable", r.status === 503 && /GEMINI_API_KEY/.test(r.body.error), JSON.stringify(r));

r = await run({ ...GEMINI, ...CLAUDE }, { gemini: () => gemini.error(404), claude: () => claude.reply(good) });
check("Claude takes over when Gemini fails", r.status === 200 && used().endsWith(`claude:${CLAUDE_MODEL}`), used());
r = await run({ ...GEMINI, ...CLAUDE }, { gemini: gemini.ok, claude: () => claude.reply(good) });
check("Claude is not called when Gemini answers", r.status === 200 && calls.every((c) => c.provider === "gemini"), used());
r = await run({ ...GEMINI, ...CLAUDE }, { gemini: () => gemini.error(404), claude: () => claude.error(500) });
check("both down: friendly 502", r.status === 502, JSON.stringify(r));

process.exit(failed ? 1 : 0);
