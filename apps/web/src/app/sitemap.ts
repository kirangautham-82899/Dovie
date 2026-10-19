import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GUIDE_SLUGS } from "@/features/seo/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  // Build time, so each deploy tells crawlers the pages may have changed.
  const lastModified = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    ...GUIDE_SLUGS.map((slug) => page(`/${slug}`, 0.9, "monthly")),
    page("/signup", 0.8, "monthly"),
    page("/login", 0.5, "monthly"),
    page("/privacy", 0.3, "yearly"),
    page("/terms", 0.3, "yearly"),
  ];
}
