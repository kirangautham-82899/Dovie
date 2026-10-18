import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can see. "/" (the landing page) is matched exactly below.
const PUBLIC_PATHS = ["/login", "/signup", "/privacy", "/terms", "/auth", "/manifest.webmanifest"];
// Signed-in people skip these and go straight to their day.
const SIGNED_OUT_ONLY = ["/", "/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims verifies the session JWT locally against the project's cached
  // signing keys (ES256), so navigation doesn't wait on a call to the auth
  // server. It still refreshes an expiring session.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims.sub ? data.claims : null;

  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    // API callers get a status they can handle, not a redirect to an HTML page.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && SIGNED_OUT_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Static assets and the public SEO files (robots, sitemap, share image,
  // manifest, search engine verification files) skip the proxy: they need no
  // session, and crawlers must reach them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|apple-icon|icons/|manifest.webmanifest|google[0-9a-f]+\\.html|BingSiteAuth\\.xml|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
