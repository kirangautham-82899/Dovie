import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dovie",
    short_name: "Dovie",
    description: "A softer place to start again. Plans, movement, money and a moment to reflect.",
    start_url: "/today",
    display: "standalone",
    background_color: "#fdf3f6",
    theme_color: "#e5567f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
