import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// 192x192 home-screen icon, listed in the web app manifest.
export function GET() {
  return new ImageResponse(<BrandIcon size={192} />, {
    width: 192,
    height: 192,
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
