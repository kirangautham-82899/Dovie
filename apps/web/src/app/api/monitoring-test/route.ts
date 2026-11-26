import { connection } from "next/server";

// A deliberate server error, for checking that reports reach Sentry with the
// personal-looking parts removed (docs/deploy.md). It only exists while
// MONITORING_TEST=1, and the proxy requires a signed-in session for /api.
export async function GET() {
  await connection();
  if (process.env.MONITORING_TEST !== "1") return new Response("Not found", { status: 404 });
  throw new Error('Dovie monitoring test for test.person@example.com "a made-up journal line"');
}
