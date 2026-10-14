import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// 512x512 maskable icon: Android crops it to the device's icon shape.
export function GET() {
  return new ImageResponse(<BrandIcon size={512} maskable />, {
    width: 512,
    height: 512,
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
