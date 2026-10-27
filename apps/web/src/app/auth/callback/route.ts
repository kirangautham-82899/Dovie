import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Supabase sends people back after Google sign-in, an email
 * confirmation link or a password reset link. Swaps the one-time code for a
 * session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A reset link signs the person in with method "recovery"; send them
      // to choose a new password rather than straight into the app.
      const { data } = await supabase.auth.getClaims();
      const amr = (data?.claims as { amr?: { method: string }[] } | undefined)?.amr ?? [];
      const recovering = amr.some((m) => m.method === "recovery");
      return NextResponse.redirect(`${origin}${recovering ? "/reset-password" : "/today"}`);
    }
  }

  // Only a short code travels in the URL; the login page owns the wording, so
  // nobody can craft a link that shows their own text on Dovie's sign-in page.
  return NextResponse.redirect(`${origin}/login?error=link`);
}
