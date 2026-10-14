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

  const description = searchParams.get("error_description") ?? "That sign-in link did not work. Please try again.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(description)}`);
}
