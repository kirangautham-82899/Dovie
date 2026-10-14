import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

// Makes Dovie installable: Android and desktop Chrome offer "Install app",
// and iOS uses it for "Add to Home Screen". The PNG icons are generated in
// src/app/icons; Chrome needs 192 and 512 px to treat the site as an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dovie: daily planner, habits & money",
    short_name: "Dovie",
    description: SITE_DESCRIPTION,
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf3f6",
    theme_color: "#e5567f",
    categories: ["productivity", "lifestyle", "finance", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Today", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Money", url: "/money", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Journal", url: "/journal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
