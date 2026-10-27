import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// The browser only ever talks to this site and the Supabase project.
const supabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();
const supabaseWs = supabase.replace(/^https:/, "wss:");

// Next.js inlines small bootstrap scripts, so scripts need 'unsafe-inline'
// (and 'unsafe-eval' for dev tooling). What stops an injected script from
// doing harm is everything else: it can't load code or send data anywhere
// but here and Supabase, can't be framed and can't post forms elsewhere.
// vercel.live is Vercel's preview toolbar; it never runs in production.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://vercel.live https://vercel.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} https://vercel.live wss://ws-us3.pusher.com${isDev ? " ws:" : ""}`,
  "frame-src https://vercel.live",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Two years, subdomains included; the site is only ever served over HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Location is used by the fitness tracker; nothing else is.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // A sitemap submitted without ".xml" would otherwise hit the sign-in
  // redirect and hand crawlers an HTML page. Config redirects run before the proxy.
  async redirects() {
    return [
      { source: "/sitemap", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap_index.xml", destination: "/sitemap.xml", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
