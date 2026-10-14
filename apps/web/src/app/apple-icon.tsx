import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// iPhone and iPad home-screen icon (Add to Home Screen). iOS rounds the
// corners itself, so this is drawn full-bleed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={180} maskable />, { ...size });
}
