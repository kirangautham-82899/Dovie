import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, signed-in screens and endpoints.
      disallow: [
        "/api/",
        "/auth/",
        "/onboarding",
        "/today",
        "/goals",
        "/money",
        "/journal",
        "/wellness",
        "/calendar",
        "/weekly",
        "/settings",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
