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
        "/fitness",
        "/planner",
        "/journal",
        "/wellness",
        "/calendar",
        "/weekly",
        "/settings",
        "/verify",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
