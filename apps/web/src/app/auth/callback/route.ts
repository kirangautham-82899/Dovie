import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Supabase sends people back after Google sign-in or an email
 * confirmation link. Swaps the one-time code for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/today`);
  }

  // Only a short code travels in the URL; the login page owns the wording, so
  // nobody can craft a link that shows their own text on Dovie's sign-in page.
  return NextResponse.redirect(`${origin}/login?error=link`);
}
