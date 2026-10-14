import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// 512x512 home-screen and splash icon, listed in the web app manifest.
export function GET() {
  return new ImageResponse(<BrandIcon size={512} />, {
    width: 512,
    height: 512,
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
